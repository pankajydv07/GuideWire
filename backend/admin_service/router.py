import os
import uuid
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import require_admin, create_access_token
from manual_claims.models import ManualClaim
from claims_service.models import Claim
from rider_service.models import Rider, Zone
from trigger_service.models import PlatformSnapshot, DisruptionEvent
from claims_service.models import Payout
from claims_service.service import (
    approve_manual_claim,
    reject_manual_claim
)
from ml.temporal import summarize_snapshot_series, build_next_week_forecast
from knowledge_graph.service import build_graph_snapshot
from trigger_service.service import get_zone_thresholds

router = APIRouter()


def _public_photo_url(photo_path: str | None) -> str | None:
    if not photo_path:
        return None

    normalized = photo_path.replace("\\", "/")
    filename = os.path.basename(normalized)
    if not filename:
        return None

    return f"/uploads/{filename}"

# ─── 1. Admin Login (Demo Hardcoded) ──────────────────────────
@router.post("/login", summary="Admin login (demo)")
async def admin_login(
    username: str = Body(..., embed=True),
    password: str = Body(..., embed=True)
):
    """
    Demo credentials: **admin** / **admin123**
    """
    if username == "admin" and password == "admin123":
        token = create_access_token(data={"sub": str(uuid.uuid4()), "role": "admin"})
        return {"access_token": token, "token_type": "bearer"}
    
    raise HTTPException(status_code=401, detail="Invalid admin credentials")


# ─── 2. Review Queue ──────────────────────────────────────────
@router.get("/claims/manual", summary="Manual claims review queue")
async def list_manual_claims(
    sort: str = Query(default="spam_score"),
    order: str = Query(default="asc"),
    status: str = Query(default="open"),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of manual claims for admin review.
    """
    stmt = select(ManualClaim)

    if status == "open":
        stmt = stmt.where(ManualClaim.review_status.in_(["pending", "under_review"]))
    elif status != "all":
        stmt = stmt.where(ManualClaim.review_status == status)
    
    if sort == "spam_score":
        if order == "desc":
            stmt = stmt.order_by(desc(ManualClaim.spam_score))
        else:
            stmt = stmt.order_by(ManualClaim.spam_score)
    else:
        stmt = stmt.order_by(desc(ManualClaim.created_at))

    result = await db.execute(stmt)
    manual_claims = result.scalars().all()

    rider_ids = {claim.rider_id for claim in manual_claims}
    zone_ids = set()

    riders_by_id = {}
    if rider_ids:
        rider_result = await db.execute(select(Rider).where(Rider.id.in_(rider_ids)))
        riders = rider_result.scalars().all()
        riders_by_id = {rider.id: rider for rider in riders}
        zone_ids = {rider.zone_id for rider in riders}

    zones_by_id = {}
    if zone_ids:
        zone_result = await db.execute(select(Zone).where(Zone.id.in_(zone_ids)))
        zones_by_id = {zone.id: zone for zone in zone_result.scalars().all()}

    claims = []
    for claim in manual_claims:
        rider = riders_by_id.get(claim.rider_id)
        zone = zones_by_id.get(rider.zone_id) if rider else None
        claims.append(
            {
                "id": str(claim.id),
                "claim_id": str(claim.claim_id) if claim.claim_id else None,
                "rider_id": str(claim.rider_id),
                "rider_name": rider.name if rider else None,
                "zone_name": zone.name if zone else None,
                "disruption_type": claim.disruption_type,
                "description": claim.description,
                "photo_path": claim.photo_path,
                "photo_url": _public_photo_url(claim.photo_path),
                "spam_score": claim.spam_score,
                "geo_valid": claim.geo_valid,
                "gps_distance_m": claim.gps_distance_m,
                "weather_match": claim.weather_match,
                "traffic_match": claim.traffic_match,
                "review_status": claim.review_status,
                "reviewer_notes": claim.reviewer_notes,
                "created_at": claim.created_at.isoformat() if claim.created_at else None,
            }
        )

    return {"claims": claims}


@router.get("/claims/auto", summary="Full claim log (auto-claims)")
async def list_all_auto_claims(
    status: str = Query(default="all"),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin view of all automated claims with fraud scores.
    """
    stmt = select(Claim).where(Claim.type == "auto")
    if status == "reviewable":
        stmt = stmt.where(Claim.status.in_(["flagged"]))
    elif status != "all":
        stmt = stmt.where(Claim.status == status)
    stmt = stmt.order_by(desc(Claim.fraud_score))
    result = await db.execute(stmt)
    claims = result.scalars().all()

    rider_ids = {claim.rider_id for claim in claims}
    riders_by_id = {}
    if rider_ids:
        rider_result = await db.execute(select(Rider).where(Rider.id.in_(rider_ids)))
        riders_by_id = {rider.id: rider for rider in rider_result.scalars().all()}

    enriched_claims = [
        {
            "id": str(claim.id),
            "rider_id": str(claim.rider_id),
            "rider_name": riders_by_id.get(claim.rider_id).name if riders_by_id.get(claim.rider_id) else None,
            "type": claim.type,
            "disruption_type": claim.disruption_type,
            "income_loss": claim.income_loss,
            "payout_amount": claim.payout_amount,
            "fraud_score": claim.fraud_score,
            "status": claim.status,
            "created_at": claim.created_at.isoformat() if claim.created_at else None,
        }
        for claim in claims
    ]

    return {"claims": enriched_claims}


# ─── 3. Review Action ─────────────────────────────────────────
@router.post("/claims/{claim_id}/approve", summary="Manually approve a claim")
async def approve_claim(
    claim_id: UUID, 
    admin=Depends(require_admin), 
    db: AsyncSession = Depends(get_db)
):
    """
    Approves a claim and triggers payout.
    """
    # 1. Resolve the correct Claim ID
    # We try finding by manual_claim.id first (common frontend mismatch), then by claim.id
    manual_claim = None
    target_claim_id = claim_id

    # Try finding as ManualClaim.id
    manual_stmt = select(ManualClaim).where(ManualClaim.id == claim_id)
    manual_result = await db.execute(manual_stmt)
    manual_claim = manual_result.scalar_one_or_none()

    if manual_claim:
        target_claim_id = manual_claim.claim_id
    else:
        # Try finding as ManualClaim.claim_id
        manual_stmt = select(ManualClaim).where(ManualClaim.claim_id == claim_id)
        manual_result = await db.execute(manual_stmt)
        manual_claim = manual_result.scalar_one_or_none()

    if not target_claim_id:
        raise HTTPException(status_code=404, detail="Target financial claim reference missing.")

    # 2. Call Dev 4 Engine with the resolved Claim ID
    result = await approve_manual_claim(target_claim_id, db=db)
    
    # 3. Finalize Manual Claim review status
    if manual_claim:
        manual_claim.review_status = "approved"
        manual_claim.reviewed_at = datetime.utcnow()
    
    await db.commit()
    return result


@router.post("/claims/{claim_id}/reject", summary="Manually reject a claim")
async def reject_claim(
    claim_id: UUID, 
    data: dict = Body(...),
    admin=Depends(require_admin), 
    db: AsyncSession = Depends(get_db)
):
    """
    Rejects a claim with a reason.
    """
    reason = data.get("reason", "Fraud detected or insufficient evidence.")
    
    # 1. Resolve the correct Claim ID
    manual_claim = None
    target_claim_id = claim_id

    # Try finding as ManualClaim.id
    manual_stmt = select(ManualClaim).where(ManualClaim.id == claim_id)
    manual_result = await db.execute(manual_stmt)
    manual_claim = manual_result.scalar_one_or_none()

    if manual_claim:
        target_claim_id = manual_claim.claim_id
    else:
        # Try finding as ManualClaim.claim_id
        manual_stmt = select(ManualClaim).where(ManualClaim.claim_id == claim_id)
        manual_result = await db.execute(manual_stmt)
        manual_claim = manual_result.scalar_one_or_none()

    if not target_claim_id:
        raise HTTPException(status_code=404, detail="Target financial claim reference missing.")

    # 2. Call Dev 4 Engine with the resolved Claim ID
    result = await reject_manual_claim(target_claim_id, reason, db=db)
    
    # 3. Finalize Manual Claim review status
    if manual_claim:
        manual_claim.review_status = "rejected"
        manual_claim.reviewer_notes = reason
        manual_claim.reviewed_at = datetime.utcnow()
    
    await db.commit()
    return result


@router.get("/claims/fraud-alerts", summary="Dedicated fraud alert queue")
async def list_fraud_alerts(
    min_score: int = Query(default=70),
    limit: int = Query(default=100),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Claim)
        .where(Claim.fraud_score >= min_score)
        .order_by(desc(Claim.fraud_score), desc(Claim.created_at))
        .limit(max(1, min(limit, 500)))
    )
    claims = (await db.execute(stmt)).scalars().all()

    rider_ids = {claim.rider_id for claim in claims}
    riders_by_id = {}
    if rider_ids:
        rider_result = await db.execute(select(Rider).where(Rider.id.in_(rider_ids)))
        riders_by_id = {r.id: r for r in rider_result.scalars().all()}

    return {
        "alerts": [
            {
                "claim_id": str(claim.id),
                "rider_id": str(claim.rider_id),
                "rider_name": riders_by_id.get(claim.rider_id).name if riders_by_id.get(claim.rider_id) else None,
                "disruption_type": claim.disruption_type,
                "fraud_score": claim.fraud_score,
                "status": claim.status,
                "payout_amount": claim.payout_amount,
                "created_at": claim.created_at.isoformat() if claim.created_at else None,
            }
            for claim in claims
        ]
    }


@router.get("/analytics/payouts", summary="Payout analytics by trigger, zone and day")
async def payout_analytics(
    days: int = Query(default=14),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    start = datetime.utcnow() - timedelta(days=max(1, min(days, 90)))

    payout_rows = (
        await db.execute(
            select(Payout, Claim, Rider, Zone)
            .join(Claim, Claim.id == Payout.claim_id)
            .join(Rider, Rider.id == Payout.rider_id)
            .join(Zone, Zone.id == Rider.zone_id)
            .where(Payout.created_at >= start)
            .order_by(desc(Payout.created_at))
        )
    ).all()

    by_trigger: dict[str, int] = {}
    by_zone: dict[str, int] = {}
    by_day: dict[str, int] = {}
    total = 0

    for payout, claim, _rider, zone in payout_rows:
        amount = int(payout.amount or 0)
        total += amount
        trigger = claim.disruption_type or "unknown"
        by_trigger[trigger] = by_trigger.get(trigger, 0) + amount
        by_zone[zone.name] = by_zone.get(zone.name, 0) + amount
        day_key = payout.created_at.strftime("%Y-%m-%d") if payout.created_at else "unknown"
        by_day[day_key] = by_day.get(day_key, 0) + amount

    return {
        "window_days": days,
        "total_payout_amount": total,
        "payout_count": len(payout_rows),
        "by_trigger": [{"trigger_type": k, "amount": v} for k, v in sorted(by_trigger.items(), key=lambda x: x[1], reverse=True)],
        "by_zone": [{"zone": k, "amount": v} for k, v in sorted(by_zone.items(), key=lambda x: x[1], reverse=True)],
        "daily_trend": [{"date": k, "amount": v} for k, v in sorted(by_day.items(), key=lambda x: x[0])],
    }


@router.get("/analytics/predictive", summary="Next-week predictive risk analytics")
async def predictive_analytics(
    days: int = Query(default=7),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    zones = (await db.execute(select(Zone))).scalars().all()
    zone_forecasts = []
    for zone in zones:
        snapshots = (
            await db.execute(
                select(PlatformSnapshot)
                .where(PlatformSnapshot.zone_id == zone.id)
                .order_by(PlatformSnapshot.time.desc())
                .limit(96)
            )
        ).scalars().all()
        recent_zone_events = (
            await db.execute(
                select(func.count(DisruptionEvent.id)).where(
                    DisruptionEvent.zone_id == zone.id,
                    DisruptionEvent.created_at >= datetime.utcnow() - timedelta(days=7),
                )
            )
        ).scalar_one() or 0
        summary = summarize_snapshot_series(
            [
                {
                    "order_rate_drop_pct": s.order_rate_drop_pct,
                    "congestion_index": s.congestion_index,
                    "earnings_current_slot": s.earnings_current_slot,
                }
                for s in snapshots
            ]
        )
        baseline_probability = min(0.9, max(0.1, (zone.composite_risk_score / 150) + (recent_zone_events / 40)))
        forecast = build_next_week_forecast(
            zone_risk_score=float(zone.composite_risk_score),
            disruption_probability=float(baseline_probability),
            avg_order_drop_pct=float(summary["avg_order_drop_pct"]),
            earnings_volatility=float(summary["earnings_volatility"]),
            days=max(3, min(days, 14)),
        )
        zone_forecasts.append(
            {
                "zone_id": str(zone.id),
                "zone": zone.name,
                "city": zone.city,
                "risk_score": zone.composite_risk_score,
                "recent_event_count": recent_zone_events,
                "forecast": forecast,
                "max_predicted_risk": max((d["predicted_disruption_probability"] for d in forecast), default=0),
            }
        )

    zone_forecasts.sort(key=lambda item: item["max_predicted_risk"], reverse=True)
    return {"window_days": days, "zones": zone_forecasts}


@router.get("/analytics/thresholds", summary="Self-calibrating trigger thresholds")
async def calibrated_thresholds(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    zones = (await db.execute(select(Zone))).scalars().all()
    results = []
    for zone in zones:
        thresholds = await get_zone_thresholds(db, str(zone.id))
        results.append({"zone_id": str(zone.id), "zone": zone.name, "thresholds": thresholds})
    return {"zones": results}


@router.get("/graph/knowledge", summary="Knowledge graph snapshot and propagation paths")
async def knowledge_graph_snapshot(
    hours: int = Query(default=72),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    return await build_graph_snapshot(db, hours=max(1, min(hours, 24 * 14)))
