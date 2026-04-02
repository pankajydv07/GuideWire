import uuid
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from shared.database import get_db
from shared.auth import require_admin, create_access_token
from manual_claims.models import ManualClaim
from claims_service.models import Claim
from claims_service.service import (
    approve_manual_claim,
    reject_manual_claim
)

router = APIRouter()

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
    db: AsyncSession = Depends(get_db)
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
    return {"claims": result.scalars().all()}


@router.get("/claims/auto", summary="Full claim log (auto-claims)")
async def list_all_auto_claims(
    admin=Depends(require_admin), 
    db: AsyncSession = Depends(get_db)
):
    """
    Admin view of all automated claims with fraud scores.
    """
    stmt = select(Claim).where(Claim.type == "auto").order_by(desc(Claim.fraud_score))
    result = await db.execute(stmt)
    return {"claims": result.scalars().all()}


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
