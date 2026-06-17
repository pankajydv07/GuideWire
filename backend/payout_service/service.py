"""
Dev 4: Payout Service - Business Logic
"""

import logging
from uuid import UUID, uuid4
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from claims_service.models import Claim
from payout_service.models import Payout
from policy_service.models import Policy
from rider_service.models import Rider

logger = logging.getLogger("zylo.payouts")


async def process_upi_payout(claim_id: UUID, rider_id: UUID, amount: int, db: AsyncSession) -> Payout:
    """
    Simulates sending an instant UPI payment.
    Always succeeds, returns the created Payout record, and publishes a PayoutCompleted event.
    """
    logger.info(f"Processing UPI payout of ₹{amount} for claim {claim_id}")

    # 1. Fetch Rider for UPI ID
    rider_result = await db.execute(select(Rider).where(Rider.id == rider_id))
    rider = rider_result.scalar_one_or_none()
    upi_id = rider.upi_id if rider else "mock@upi"

    # 2. Create Payout record
    payout = Payout(
        id=uuid4(),
        claim_id=claim_id,
        rider_id=rider_id,
        amount=amount,
        method="upi",
        upi_id=upi_id,
        status="completed",
        reference_id=f"UPI-{uuid4().hex[:12].upper()}",
        created_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    
    db.add(payout)
    await db.commit()
    
    logger.info(f"Payout {payout.id} completed. Ref: {payout.reference_id}")

    # 3. Publish PayoutCompleted event
    from shared.redis_client import publish_event
    try:
        await publish_event(
            "stream:payout_completed",
            "PayoutCompleted",
            {
                "payout_id": str(payout.id),
                "claim_id": str(claim_id),
                "rider_id": str(rider_id),
                "amount": float(amount),
                "status": "success",
                "reference_id": payout.reference_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    except Exception as e:
        logger.error(f"Failed to publish PayoutCompleted event: {e}")

    return payout


async def get_rider_payouts(rider_id: UUID, db: AsyncSession) -> list[Payout]:
    """Fetch all payouts for a rider, descending by creation time."""
    result = await db.execute(
        select(Payout).where(Payout.rider_id == rider_id).order_by(Payout.created_at.desc())
    )
    return result.scalars().all()
