"""
Dev 2: Policy Service Router — STUB

Endpoints:
    GET  /api/policies/quote
    POST /api/policies
    GET  /api/policies/active
    GET  /api/policies/{policy_id}
    PUT  /api/policies/{policy_id}/renew
    DELETE /api/policies/{policy_id}
"""

from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_rider

router = APIRouter()


@router.get("/quote")
async def get_quote(slots: str = "", city: str = "", rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 2):
    - Parse slots from query string
    - Fetch zone risk from DB
    - Call ML model for disruption_probability
    - Calculate 3-tier pricing
    - Return quotes with risk_breakdown
    """
    return {"quotes": [], "message": "implement me"}


@router.post("", status_code=201)
async def create_policy(data: dict, rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 2):
    - Validate no duplicate policy for same week
    - Calculate premium via ML model
    - Create Policy record
    - Process mock UPI payment
    - Return active policy
    """
    return {"message": "implement me"}


@router.get("/active")
async def get_active_policy(rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 2):
    - Find active policy for current week
    - Calculate hours_remaining, coverage_used
    - Return policy status
    """
    return {"message": "implement me"}


@router.get("/{policy_id}")
async def get_policy(policy_id: UUID, rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """TODO (Dev 2): Return full policy details with claims_history."""
    return {"message": "implement me"}


@router.put("/{policy_id}/renew")
async def renew_policy(policy_id: UUID, rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """TODO (Dev 2): Recalculate premium, create new policy for next week."""
    return {"message": "implement me"}


@router.delete("/{policy_id}", status_code=204)
async def cancel_policy(policy_id: UUID, rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """TODO (Dev 2): Set policy status to cancelled."""
    return None
