"""
Dev 4: Payout Service Router — STUB

Endpoint:
    GET /api/payouts — list rider's payouts
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_rider

router = APIRouter()


@router.get("")
async def list_payouts(rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 4):
    - Query payouts for this rider
    - Return list with payout_id, claim_id, amount, method, upi_id, status
    """
    return {"payouts": []}
