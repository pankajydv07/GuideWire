"""
Dev 5: Admin Service Router — STUB

Endpoints:
    GET  /api/admin/claims         — list all auto claims
    GET  /api/admin/claims/manual  — list manual claims (review queue)
    POST /api/admin/claims/{claim_id}/approve
    POST /api/admin/claims/{claim_id}/reject
"""

from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import require_admin

router = APIRouter()


@router.get("/claims")
async def list_all_claims(admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 5):
    - Query all auto claims (admin view)
    - Return list with claim details + fraud_score
    """
    return {"claims": []}


@router.get("/claims/manual")
async def list_manual_claims(
    sort: str = Query(default="spam_score"),
    order: str = Query(default="asc"),
    admin=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    TODO (Dev 5):
    - Query manual_claims with status = pending or under_review
    - Sort by spam_score ascending (low-risk first)
    - Include geo_validation and corroboration data
    """
    return {"claims": []}


@router.post("/claims/{claim_id}/approve")
async def approve_claim(claim_id: UUID, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 5):
    - Call Dev 4's approve_manual_claim(claim_id)
    - Return claim status + payout_id
    """
    from claims_service.service import approve_manual_claim
    result = await approve_manual_claim(claim_id, db=db)
    return result


@router.post("/claims/{claim_id}/reject")
async def reject_claim(claim_id: UUID, data: dict, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 5):
    - Extract rejection reason from data
    - Call Dev 4's reject_manual_claim(claim_id, reason)
    - Return rejection status + reason
    """
    from claims_service.service import reject_manual_claim
    reason = data.get("reason", "No reason provided")
    result = await reject_manual_claim(claim_id, reason, db=db)
    return result
