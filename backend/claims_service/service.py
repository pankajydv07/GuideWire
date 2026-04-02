"""
Dev 4: Claims Service - Business Logic

Handles the core claims engine for both auto and manual tracks.
"""

from uuid import UUID
import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from claims_service.models import Claim
from trigger_service.models import DisruptionEvent, PlatformSnapshot
from rider_service.models import Rider, RiderZoneBaseline
from policy_service.models import Policy
from claims_service.fraud import run_fraud_check, check_duplicate_claim
from payout_service.service import process_upi_payout

logger = logging.getLogger("ridershield.claims")

# We use 180 as a realistic fallback hourly rate for delivery riders if no baseline exists
FALLBACK_HOURLY_RATE = 180


async def process_auto_claims(disruption_event_id: UUID, db: AsyncSession) -> int:
    """
    Called by Dev 3 when a DisruptionEvent is verified and created.
    Returns the number of claims successfully generated.
    """
    logger.info(f"Processing auto-claims for event {disruption_event_id}")
    claims_created = 0

    # 1. Fetch Disruption Event details
    event_result = await db.execute(select(DisruptionEvent).where(DisruptionEvent.id == disruption_event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        logger.error(f"DisruptionEvent {disruption_event_id} not found.")
        return 0

    zone_id = event.zone_id
    slot_start = event.slot_start

    # Determine slot string (e.g. '18:00-21:00') from the datetime
    # We simplify this by checking the hour of slot_start to find the appropriate slot bucket
    hour = slot_start.hour
    if 18 <= hour < 21:
        slot_time_str = "18:00-21:00"
    elif 21 <= hour < 23:
        slot_time_str = "21:00-23:00"
    else:
        # Generic fallback
        slot_time_str = f"{hour:02d}:00-{(hour+3):02d}:00"

    current_week = slot_start.strftime("%Y-W%V")

    # 2. Find riders with active policies in the affected zone
    # We join Policy and Rider to get riders in this zone who are actively insured
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

    # 3. Process each rider
    for policy in active_policies:
        rider_id = policy.rider_id

        # Skip if duplicate claim already exists
        if await check_duplicate_claim(rider_id, disruption_event_id, db):
            continue

        # Get Baseline (Expected Earnings)
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

        # Get Actual Earnings from Snapshot
        snapshot_result = await db.execute(
            select(PlatformSnapshot).where(
                PlatformSnapshot.rider_id == rider_id,
                PlatformSnapshot.time == slot_start
            )
        )
        snapshot = snapshot_result.scalar_one_or_none()
        actual_earnings = snapshot.earnings_current_slot if snapshot else 0

        # Calculate Income Gap
        income_loss = expected_earnings - actual_earnings
        if income_loss <= 0:
            continue  # No loss, no claim

        # Fraud Check
        fraud_score = await run_fraud_check(
            rider_id=rider_id,
            zone_id=zone_id,
            disruption_event_id=disruption_event_id,
            actual_earnings=actual_earnings,
            slot_start=slot_start,
            db=db
        )

        # Calculate Payout
        coverage_remaining = max(0, policy.coverage_limit - policy.coverage_used)
        payout_amount = min(income_loss, coverage_remaining)

        if payout_amount <= 0:
            continue  # Coverage exhausted

        # Create Claim
        claim = Claim(
            rider_id=rider_id,
            policy_id=policy.id,
            disruption_event_id=disruption_event_id,
            type="auto",
            disruption_type=event.trigger_type,
            income_loss=income_loss,
            expected_earnings=expected_earnings,
            actual_earnings=actual_earnings,
            payout_amount=payout_amount,
            fraud_score=fraud_score,
            status="paid",
            created_at=datetime.utcnow(),
            processed_at=datetime.utcnow()
        )
        db.add(claim)
        await db.flush()  # to get claim.id

        # Trigger Payout
        await process_upi_payout(claim.id, rider_id, payout_amount, db)
        claims_created += 1

    await db.commit()
    logger.info(f"Auto-claims processing complete. Created {claims_created} claims.")
    return claims_created


async def process_manual_claim(claim_data: dict, db: AsyncSession) -> dict:
    """
    Called by Dev 5's router when a manual claim passes initial spam check (< 70).
    Expects schema from ManualClaimInput.
    """
    rider_id = claim_data["rider_id"]
    policy_id = claim_data["policy_id"]
    incident_time = claim_data["incident_time"]
    
    logger.info(f"Processing manual claim for rider {rider_id}")

    # Fetch policy to get coverage logic
    policy_result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = policy_result.scalar_one_or_none()
    
    if not policy:
        raise HTTPException(status_code=400, detail="Policy not found")

    # In manual claims, without strict `PlatformSnapshot` guarantees, we rely on the 
    # estimated 3-hour loss window average (e.g., ₹540 total)
    expected_earnings = FALLBACK_HOURLY_RATE * 3
    actual_earnings = 0
    income_loss = expected_earnings - actual_earnings
    
    coverage_remaining = max(0, policy.coverage_limit - policy.coverage_used)
    payout_amount = min(income_loss, coverage_remaining)
    
    # Create Claim in 'under_review' mode
    claim = Claim(
        rider_id=rider_id,
        policy_id=policy_id,
        type="manual",
        disruption_type=claim_data.get("disruption_type"),
        income_loss=income_loss,
        expected_earnings=expected_earnings,
        actual_earnings=actual_earnings,
        payout_amount=payout_amount,
        fraud_score=claim_data.get("spam_score", 0),
        status="under_review",
        created_at=datetime.utcnow()
    )
    db.add(claim)
    await db.flush()
    # Let calling function (Dev 5) do the commit.
    
    return {"claim_id": str(claim.id), "status": "under_review", "payout_amount": payout_amount}


async def approve_manual_claim(claim_id: UUID, db: AsyncSession) -> dict:
    """
    Called by Dev 5 when admin manually approves a claim.
    """
    logger.info(f"Approving manual claim {claim_id}")
    
    claim_result = await db.execute(select(Claim).where(Claim.id == claim_id))
    claim = claim_result.scalar_one_or_none()
    
    if not claim:
         raise HTTPException(status_code=404, detail="Claim not found")
         
    if claim.status in ("approved", "paid", "rejected"):
         raise HTTPException(status_code=400, detail="CLAIM_ALREADY_REVIEWED")
         
    # Update Status
    claim.status = "paid"
    claim.processed_at = datetime.utcnow()
    
    # Process Payout
    payout = await process_upi_payout(claim.id, claim.rider_id, claim.payout_amount, db)
    
    # Let calling function commit.
    return {"claim_id": str(claim.id), "status": "approved", "payout_id": str(payout.id), "payout_amount": claim.payout_amount}


async def reject_manual_claim(claim_id: UUID, reason: str, db: AsyncSession) -> dict:
    """
    Called by Dev 5 when admin manually rejects a claim.
    """
    logger.info(f"Rejecting manual claim {claim_id}: {reason}")
    
    claim_result = await db.execute(select(Claim).where(Claim.id == claim_id))
    claim = claim_result.scalar_one_or_none()
    
    if not claim:
         raise HTTPException(status_code=404, detail="Claim not found")
         
    if claim.status in ("approved", "paid", "rejected"):
         raise HTTPException(status_code=400, detail="CLAIM_ALREADY_REVIEWED")
         
    claim.status = "rejected"
    claim.processed_at = datetime.utcnow()
    # (Dev 5 handles saving the `reviewer_notes` reason in the manual_claims table)
    
    return {"claim_id": str(claim.id), "status": "rejected", "reason": reason}
