import os
import uuid
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import require_admin, create_access_token
from manual_claims.models import ManualClaim
from claims_service.models import Claim
from rider_service.models import Rider, Zone
from claims_service.service import (
    approve_manual_claim,
    reject_manual_claim
)

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
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns list of pending manual claims.
    """
    stmt = select(ManualClaim).where(ManualClaim.review_status == "pending")
    
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
                "created_at": claim.created_at.isoformat() if claim.created_at else None,
            }
        )

    return {"claims": claims}


@router.get("/claims/auto", summary="Full claim log (auto-claims)")
async def list_all_auto_claims(
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin view of all automated claims with fraud scores.
    """
    stmt = select(Claim).where(Claim.type == "auto").order_by(desc(Claim.fraud_score))
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
    # 1. Update Manual Claim Status if it exists
    manual_stmt = select(ManualClaim).where(ManualClaim.claim_id == claim_id)
    manual_result = await db.execute(manual_stmt)
    manual_claim = manual_result.scalar_one_or_none()

    # 2. Call Dev 4 Engine
    result = await approve_manual_claim(claim_id, db=db)
    
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
    
    # 1. Update Manual Claim Status if it exists
    manual_stmt = select(ManualClaim).where(ManualClaim.claim_id == claim_id)
    manual_result = await db.execute(manual_stmt)
    manual_claim = manual_result.scalar_one_or_none()

    # 2. Call Dev 4 Engine
    result = await reject_manual_claim(claim_id, reason, db=db)
    
    if manual_claim:
        manual_claim.review_status = "rejected"
        manual_claim.reviewer_notes = reason
        manual_claim.reviewed_at = datetime.utcnow()
    
    await db.commit()
    return result
