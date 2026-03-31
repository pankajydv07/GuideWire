"""
Dev 4: Claims Service Router — STUB

Endpoints:
    GET /api/claims
    GET /api/claims/{claim_id}
"""

from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_rider

router = APIRouter()


@router.get("")
async def list_claims(rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 4):
    - Query claims for this rider
    - Return list with claim_id, type, income_loss, payout_amount, status
    """
    return {"claims": []}


@router.get("/{claim_id}")
async def get_claim(claim_id: UUID, rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 4):
    - Fetch claim by ID, verify rider ownership
    - Return full breakdown: expected, actual, loss, payout, fraud_score
    """
    return {"message": "implement me"}
