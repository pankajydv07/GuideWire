"""
Dev 4: Claims Service — Business Logic

These functions are called by:
- Dev 3's trigger_service (auto claims on disruption events)
- Dev 5's admin_service (approve/reject manual claims)
"""

from uuid import UUID
import logging

logger = logging.getLogger("ridershield.claims")


async def process_auto_claims(disruption_event_id: UUID, db=None):
    """
    Called by Dev 3 when a DisruptionEvent is created.
    
    TODO (Dev 4):
    1. Get disruption event details (zone, slot, trigger_type)
    2. Find all riders with active policies in that zone
    3. Filter: rider online + in-zone (from platform_snapshots)
    4. For each rider:
       a. Calculate income gap (baseline - actual)
       b. Run basic fraud check (GPS + peer comparison)
       c. Calculate payout = min(income_loss, coverage_remaining)
       d. Create Claim record (type="auto")
       e. Create Payout record (mock UPI)
       f. Update policy.coverage_used
    5. Log results
    """
    logger.info(f"Processing auto-claims for event {disruption_event_id}")
    # TODO: Implement
    pass


async def process_manual_claim(claim_data: dict, db=None) -> dict:
    """
    Called by Dev 5 when a manual claim passes spam check.
    
    TODO (Dev 4):
    1. Calculate income gap
    2. Create Claim record (type="manual", status="under_review")
    3. Return claim details
    """
    logger.info(f"Processing manual claim for rider {claim_data.get('rider_id')}")
    # TODO: Implement
    return {"claim_id": "placeholder", "status": "under_review"}


async def approve_manual_claim(claim_id: UUID, db=None) -> dict:
    """
    Called by Dev 5 when admin approves a manual claim.
    
    TODO (Dev 4):
    1. Update claim status to "approved"
    2. Create Payout record
    3. Process mock UPI
    4. Update policy.coverage_used
    5. Return payout details
    """
    logger.info(f"Approving manual claim {claim_id}")
    # TODO: Implement
    return {"claim_id": str(claim_id), "status": "approved", "payout_id": "placeholder"}


async def reject_manual_claim(claim_id: UUID, reason: str, db=None) -> dict:
    """
    Called by Dev 5 when admin rejects a manual claim.
    
    TODO (Dev 4):
    1. Update claim status to "rejected"
    2. Store rejection reason
    3. Return rejection details
    """
    logger.info(f"Rejecting manual claim {claim_id}: {reason}")
    # TODO: Implement
    return {"claim_id": str(claim_id), "status": "rejected", "reason": reason}
