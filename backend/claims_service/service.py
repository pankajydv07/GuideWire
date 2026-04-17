"""
Dev 4: Claims Service - Business Logic

Handles the core claims engine for both auto and manual tracks.
"""

from uuid import UUID
import logging
from datetime import datetime
from types import SimpleNamespace

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import OperationalError, ProgrammingError
from fastapi import HTTPException

from claims_service.models import Claim, Payout
from trigger_service.models import DisruptionEvent, PlatformSnapshot, DisruptionRiderTrace
from rider_service.models import Rider, RiderZoneBaseline
from policy_service.models import Policy
from claims_service.fraud import (
    AUTO_CLAIM_FRAUD_THRESHOLD,
    run_fraud_check,
    check_duplicate_claim,
)
from payout_service.service import process_upi_payout
from trigger_service.trace_service import (
    create_rider_trace,
    persist_trace_state,
    update_event_processing_status,
    upsert_step,
)

logger = logging.getLogger("zylo.claims")

FALLBACK_HOURLY_RATE = 180


def _slot_bucket(slot_start: datetime) -> str:
    hour = slot_start.hour
    if 18 <= hour < 21:
        return "18:00-21:00"
    if 21 <= hour < 23:
        return "21:00-23:00"
    return f"{hour:02d}:00-{min(hour + 3, 23):02d}:00"


def _slot_window(value: datetime) -> tuple[str, datetime, datetime]:
    slot_time_str = _slot_bucket(value)
    start_raw, end_raw = slot_time_str.split("-")
    start_hour = int(start_raw.split(":")[0])
    end_hour = int(end_raw.split(":")[0])
    slot_start = value.replace(hour=start_hour, minute=0, second=0, microsecond=0)
    slot_end = value.replace(hour=end_hour, minute=0, second=0, microsecond=0)
    return slot_time_str, slot_start, slot_end


def _json_safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


async def _update_trace(
    db: AsyncSession,
    trace: DisruptionRiderTrace,
    **fields,
) -> None:
    for key, value in fields.items():
        setattr(trace, key, value)
    await persist_trace_state(db)


async def _load_event_compat(disruption_event_id: UUID, db: AsyncSession):
    try:
        event_result = await db.execute(select(DisruptionEvent).where(DisruptionEvent.id == disruption_event_id))
        return event_result.scalar_one_or_none()
    except (OperationalError, ProgrammingError):
        await db.rollback()
        row = (
            await db.execute(
                text(
                    "SELECT id, trigger_type, zone_id, zone_name, slot_start, slot_end, severity, data_json, affected_riders, created_at "
                    "FROM disruption_events WHERE id = :event_id"
                ),
                {"event_id": str(disruption_event_id)},
            )
        ).mappings().first()
        if not row:
            return None
        return SimpleNamespace(
            id=row["id"],
            trigger_type=row["trigger_type"],
            zone_id=row["zone_id"],
            zone_name=row["zone_name"],
            slot_start=row["slot_start"],
            slot_end=row["slot_end"],
            severity=row["severity"],
            data_json=row["data_json"],
            affected_riders=row["affected_riders"],
            created_at=row["created_at"],
            source="scheduler",
            processing_status="completed",
        )


async def process_auto_claims(disruption_event_id: UUID, db: AsyncSession) -> int:
    """
    Called by Dev 3 when a DisruptionEvent is verified and created.
    Returns the number of claims successfully generated.
    """
    logger.info(f"Processing auto-claims for event {disruption_event_id}")
    claims_created = 0

    event = await _load_event_compat(disruption_event_id, db)
    if not event:
        logger.error(f"DisruptionEvent {disruption_event_id} not found.")
        return 0

    await update_event_processing_status(db, disruption_event_id, "processing")
    await upsert_step(db, disruption_event_id, "riders_identified", status="in_progress", meta={"candidate_count": 0})
    await upsert_step(db, disruption_event_id, "verification", status="pending", meta={"processed": 0})
    await upsert_step(db, disruption_event_id, "payout", status="pending", meta={"paid": 0, "blocked": 0})
    await persist_trace_state(db)

    zone_id = event.zone_id
    slot_start = event.slot_start
    slot_time_str = _slot_bucket(slot_start)
    current_week = slot_start.strftime("%Y-W%V")

    policy_query = (
        select(Policy)
        .join(Rider, Rider.id == Policy.rider_id)
        .where(
            Rider.zone_id == zone_id,
            Policy.status == "active",
            Policy.week == current_week
        )
    )
    active_policies_result = await db.execute(policy_query)
    active_policies = active_policies_result.scalars().all()

    logger.info(f"Found {len(active_policies)} active policies in zone {zone_id} for week {current_week}")
    await upsert_step(
        db,
        disruption_event_id,
        "riders_identified",
        status="completed",
        meta={"candidate_count": len(active_policies)},
    )
    await upsert_step(
        db,
        disruption_event_id,
        "verification",
        status="in_progress",
        meta={"candidate_count": len(active_policies), "processed": 0},
    )
    await persist_trace_state(db)

    paid_count = 0
    blocked_count = 0
    verified_count = 0
    system_failed_count = 0
    ineligible_count = 0

    for idx, policy in enumerate(active_policies, start=1):
        rider_id = policy.rider_id
        trace = await create_rider_trace(
            db,
            disruption_event_id=disruption_event_id,
            rider_id=rider_id,
            zone_id=zone_id,
            processing_stage="detected",
            verification_result="pending",
            payout_status="pending",
            trace_json={"policy_id": str(policy.id), "week": current_week, "candidate_index": idx},
        )
        await persist_trace_state(db)

        try:
            if await check_duplicate_claim(rider_id, disruption_event_id, db):
                await _update_trace(
                    db,
                    trace,
                    processing_stage="fraud_flagged",
                    verification_result="fail",
                    verification_reason="duplicate_claim",
                    payout_status="blocked",
                    trace_json={**(trace.trace_json or {}), "duplicate_claim": True},
                )
                blocked_count += 1
                continue

            baseline_result = await db.execute(
                select(RiderZoneBaseline).where(
                    RiderZoneBaseline.rider_id == rider_id,
                    RiderZoneBaseline.zone_id == zone_id,
                    RiderZoneBaseline.week == current_week,
                    RiderZoneBaseline.slot_time == slot_time_str
                )
            )
            baseline = baseline_result.scalar_one_or_none()
            expected_earnings = baseline.avg_earnings if baseline else FALLBACK_HOURLY_RATE * 3

            snapshot_result = await db.execute(
                select(PlatformSnapshot).where(
                    PlatformSnapshot.rider_id == rider_id,
                    PlatformSnapshot.time >= slot_start,
                    PlatformSnapshot.time <= event.slot_end,
                )
                .order_by(PlatformSnapshot.time.desc())
                .limit(1)
            )
            snapshot = snapshot_result.scalar_one_or_none()
            actual_earnings = snapshot.earnings_current_slot if snapshot else 0

            await _update_trace(
                db,
                trace,
                processing_stage="fetched",
                expected_earnings=expected_earnings,
                actual_earnings=actual_earnings,
                snapshot_time=snapshot.time if snapshot else None,
                trace_json={
                    **(trace.trace_json or {}),
                    "baseline_found": baseline is not None,
                    "snapshot_found": snapshot is not None,
                    "snapshot": _json_safe(
                        {
                            "time": snapshot.time if snapshot else None,
                            "zone_id": str(snapshot.zone_id) if snapshot else None,
                            "rider_status": snapshot.rider_status if snapshot else None,
                            "platform_status": snapshot.platform_status if snapshot else None,
                            "order_rate_drop_pct": float(snapshot.order_rate_drop_pct or 0) if snapshot else None,
                            "congestion_index": snapshot.congestion_index if snapshot else None,
                        }
                    ),
                },
            )
            await _update_trace(db, trace, processing_stage="under_verification")

            income_loss = expected_earnings - actual_earnings
            eligible_payout_amount = min(max(income_loss, 0), max(0, policy.coverage_limit - policy.coverage_used))
            await _update_trace(
                db,
                trace,
                income_loss=max(income_loss, 0),
                eligible_payout_amount=eligible_payout_amount,
            )

            if not snapshot:
                await _update_trace(
                    db,
                    trace,
                    processing_stage="verified",
                    verification_result="fail",
                    verification_reason="missing_snapshot",
                    payout_status="not_eligible",
                )
                ineligible_count += 1
                continue

            if income_loss <= 0:
                await _update_trace(
                    db,
                    trace,
                    processing_stage="verified",
                    verification_result="pass",
                    verification_reason="no_income_loss",
                    payout_status="not_eligible",
                )
                ineligible_count += 1
                continue

            fraud_score = await run_fraud_check(
                rider_id=rider_id,
                zone_id=zone_id,
                disruption_event_id=disruption_event_id,
                actual_earnings=actual_earnings,
                slot_start=slot_start,
                slot_end=event.slot_end,
                db=db
            )
            await _update_trace(
                db,
                trace,
                fraud_score=fraud_score,
                trace_json={
                    **(trace.trace_json or {}),
                    "verification": {
                        "gps_snapshot_zone_match": str(snapshot.zone_id) == str(zone_id),
                        "peer_comparison_applied": True,
                        "baseline_found": baseline is not None,
                        "duplicate_check": True,
                        "anomaly_score_checked": True,
                        "collusion_check": True,
                    },
                    "fraud_threshold": AUTO_CLAIM_FRAUD_THRESHOLD,
                },
            )

            coverage_remaining = max(0, policy.coverage_limit - policy.coverage_used)
            payout_amount = min(income_loss, coverage_remaining)
            if payout_amount <= 0:
                await _update_trace(
                    db,
                    trace,
                    verification_result="pass",
                    verification_reason="no_coverage_remaining",
                    payout_status="not_eligible",
                    processing_stage="verified",
                )
                verified_count += 1
                ineligible_count += 1
                continue

            flagged = fraud_score >= AUTO_CLAIM_FRAUD_THRESHOLD
            claim = Claim(
                rider_id=rider_id,
                policy_id=policy.id,
                disruption_event_id=disruption_event_id,
                type="auto",
                disruption_type=event.trigger_type,
                income_loss=income_loss,
                expected_earnings=expected_earnings,
                actual_earnings=actual_earnings,
                payout_amount=0 if flagged else payout_amount,
                fraud_score=fraud_score,
                status="flagged" if flagged else "paid",
                created_at=datetime.utcnow(),
                processed_at=datetime.utcnow()
            )
            db.add(claim)
            await db.flush()
            await _update_trace(
                db,
                trace,
                claim_id=claim.id,
                processing_stage="fraud_flagged" if flagged else "verified",
                verification_result="fail" if flagged else "pass",
                verification_reason="fraud_threshold_exceeded" if flagged else "eligible_for_payout",
                payout_status="blocked" if flagged else "pending",
            )

            if flagged:
                logger.warning(
                    "Auto-claim flagged for review: rider=%s event=%s fraud_score=%s threshold=%s",
                    rider_id,
                    disruption_event_id,
                    fraud_score,
                    AUTO_CLAIM_FRAUD_THRESHOLD,
                )
                blocked_count += 1
            else:
                await _update_trace(db, trace, processing_stage="payout_queued")
                await process_upi_payout(claim.id, rider_id, payout_amount, db)
                payout_result = await db.execute(select(Payout).where(Payout.claim_id == claim.id).limit(1))
                payout = payout_result.scalar_one_or_none()
                await _update_trace(
                    db,
                    trace,
                    payout_id=payout.id if payout else None,
                    payout_status="completed",
                    processing_stage="paid",
                )
                paid_count += 1
                verified_count += 1
            claims_created += 1
        except Exception as exc:
            logger.exception("Auto-claim processing failed for rider %s event %s: %s", rider_id, disruption_event_id, exc)
            await _update_trace(
                db,
                trace,
                processing_stage="failed",
                verification_result="fail",
                verification_reason="processing_error",
                payout_status="blocked",
                trace_json={**(trace.trace_json or {}), "error": str(exc)},
            )
            system_failed_count += 1

        await upsert_step(
            db,
            disruption_event_id,
            "verification",
            status="in_progress",
            meta={
                "candidate_count": len(active_policies),
                "processed": idx,
                "verified": verified_count,
                "blocked": blocked_count,
                "ineligible": ineligible_count,
                "failed": system_failed_count,
            },
        )
        await upsert_step(
            db,
            disruption_event_id,
            "payout",
            status="in_progress",
            meta={"paid": paid_count, "blocked": blocked_count, "ineligible": ineligible_count},
        )
        await persist_trace_state(db)

    final_status = "failed" if system_failed_count > 0 else "completed"
    await upsert_step(
        db,
        disruption_event_id,
        "verification",
        status="failed" if system_failed_count > 0 else "completed",
        meta={
            "candidate_count": len(active_policies),
            "processed": len(active_policies),
            "verified": verified_count,
            "blocked": blocked_count,
            "ineligible": ineligible_count,
            "failed": system_failed_count,
        },
    )
    await upsert_step(
        db,
        disruption_event_id,
        "payout",
        status="failed" if system_failed_count > 0 else "completed",
        meta={"paid": paid_count, "blocked": blocked_count, "ineligible": ineligible_count},
    )
    await update_event_processing_status(db, disruption_event_id, final_status)
    await persist_trace_state(db)
    logger.info(f"Auto-claims processing complete. Created {claims_created} claims.")
    return claims_created


async def process_manual_claim(claim_data: dict, db: AsyncSession) -> dict:
    """
    Creates the financial claim anchor for a manual claim and applies the
    adjudicated decision immediately.
    """
    rider_id = claim_data["rider_id"]
    policy_id = claim_data["policy_id"]
    incident_time = claim_data["incident_time"]

    logger.info(f"Processing manual claim for rider {rider_id}")

    policy_result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = policy_result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=400, detail="Policy not found")

    rider_result = await db.execute(select(Rider).where(Rider.id == rider_id))
    rider = rider_result.scalar_one_or_none()

    claim_week = incident_time.strftime("%Y-W%V")
    slot_time_str, slot_start, slot_end = _slot_window(incident_time)

    expected_earnings = FALLBACK_HOURLY_RATE * 3
    if rider:
        baseline_result = await db.execute(
            select(RiderZoneBaseline).where(
                RiderZoneBaseline.rider_id == rider_id,
                RiderZoneBaseline.zone_id == rider.zone_id,
                RiderZoneBaseline.week == claim_week,
                RiderZoneBaseline.slot_time == slot_time_str
            )
        )
        baseline = baseline_result.scalar_one_or_none()
        if baseline:
            expected_earnings = baseline.avg_earnings

    snapshot_result = await db.execute(
        select(PlatformSnapshot)
        .where(
            PlatformSnapshot.rider_id == rider_id,
            PlatformSnapshot.time >= slot_start,
            PlatformSnapshot.time <= slot_end
        )
        .order_by(PlatformSnapshot.time.desc())
        .limit(1)
    )
    snapshot = snapshot_result.scalar_one_or_none()
    actual_earnings = snapshot.earnings_current_slot if snapshot else 0

    income_loss = expected_earnings - actual_earnings
    coverage_remaining = max(0, policy.coverage_limit - policy.coverage_used)
    payout_amount = min(max(income_loss, 0), coverage_remaining)

    review_decision = claim_data.get("review_decision", "under_review")
    review_reason = claim_data.get("review_reason")

    claim = Claim(
        rider_id=rider_id,
        policy_id=policy_id,
        type="manual",
        disruption_type=claim_data.get("disruption_type"),
        income_loss=max(income_loss, 0),
        expected_earnings=expected_earnings,
        actual_earnings=actual_earnings,
        payout_amount=payout_amount,
        fraud_score=claim_data.get("spam_score", 0),
        status="under_review",
        created_at=datetime.utcnow(),
    )
    db.add(claim)
    await db.flush()

    payout_id = None
    result_status = "under_review"

    if review_decision == "approved":
        claim.status = "paid"
        claim.processed_at = datetime.utcnow()
        payout = await process_upi_payout(claim.id, claim.rider_id, claim.payout_amount, db)
        payout_id = str(payout.id)
        result_status = "approved"
    elif review_decision == "rejected":
        claim.status = "rejected"
        claim.processed_at = datetime.utcnow()
        result_status = "rejected"

    return {
        "claim_id": str(claim.id),
        "status": result_status,
        "payout_amount": payout_amount,
        "payout_id": payout_id,
        "reason": review_reason,
    }


async def approve_manual_claim(claim_id: UUID, db: AsyncSession, allow_override: bool = False) -> dict:
    """
    Called by Dev 5 when admin manually approves a claim.
    """
    logger.info(f"Approving manual claim {claim_id}")

    claim_result = await db.execute(select(Claim).where(Claim.id == claim_id))
    claim = claim_result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.status == "paid":
        existing_payout_result = await db.execute(select(Payout).where(Payout.claim_id == claim.id).limit(1))
        existing_payout = existing_payout_result.scalar_one_or_none()
        if not allow_override:
            raise HTTPException(status_code=400, detail="CLAIM_ALREADY_REVIEWED")
        return {
            "claim_id": str(claim.id),
            "status": "approved",
            "payout_id": str(existing_payout.id) if existing_payout else None,
            "payout_amount": claim.payout_amount,
            "overridden": False,
        }
    if claim.status == "rejected" and not allow_override:
        raise HTTPException(status_code=400, detail="CLAIM_ALREADY_REVIEWED")

    claim.status = "paid"
    claim.processed_at = datetime.utcnow()

    payout = await process_upi_payout(claim.id, claim.rider_id, claim.payout_amount, db)

    return {
        "claim_id": str(claim.id),
        "status": "approved",
        "payout_id": str(payout.id),
        "payout_amount": claim.payout_amount,
        "overridden": allow_override,
    }


async def reject_manual_claim(claim_id: UUID, reason: str, db: AsyncSession, allow_override: bool = False) -> dict:
    """
    Called by Dev 5 when admin manually rejects a claim.
    """
    logger.info(f"Rejecting manual claim {claim_id}: {reason}")

    claim_result = await db.execute(select(Claim).where(Claim.id == claim_id))
    claim = claim_result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    payout_reversal_required = claim.status == "paid"
    if claim.status == "rejected" and not allow_override:
        raise HTTPException(status_code=400, detail="CLAIM_ALREADY_REVIEWED")
    if claim.status == "paid" and not allow_override:
        raise HTTPException(status_code=400, detail="CLAIM_ALREADY_REVIEWED")

    claim.status = "rejected"
    claim.processed_at = datetime.utcnow()

    return {
        "claim_id": str(claim.id),
        "status": "rejected",
        "reason": reason,
        "overridden": allow_override,
        "payout_reversal_required": payout_reversal_required,
    }
