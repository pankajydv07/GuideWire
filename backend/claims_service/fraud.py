"""
Dev 4: Fraud Detection Logic
"""

import logging
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from claims_service.models import Claim
from trigger_service.models import PlatformSnapshot
from rider_service.models import RiderZoneBaseline

logger = logging.getLogger("zylo.claims.fraud")


async def check_duplicate_claim(rider_id: UUID, disruption_event_id: UUID, db: AsyncSession) -> bool:
    """Check if a claim already exists for this rider and disruption event."""
    result = await db.execute(
        select(Claim).where(
            Claim.rider_id == rider_id,
            Claim.disruption_event_id == disruption_event_id,
            Claim.status.in_(["pending", "under_review", "approved", "paid"])
        )
    )
    return result.scalar_one_or_none() is not None


async def run_fraud_check(
    rider_id: UUID,
    zone_id: UUID,
    disruption_event_id: UUID,
    actual_earnings: int,
    slot_start: datetime,
    db: AsyncSession
) -> int:
    """
    Calculates a fraud score (0-100).
    Higher score = higher probability of fraud.
    """
    score = 0

    # 1. GPS Consistency (30 pts)
    # Rider should have a snapshot in the disruption zone during the slot
    snapshot_result = await db.execute(
        select(PlatformSnapshot).where(
            PlatformSnapshot.rider_id == rider_id,
            PlatformSnapshot.time == slot_start
        )
    )
    snapshot = snapshot_result.scalar_one_or_none()
    
    if not snapshot or snapshot.zone_id != zone_id:
        logger.warning(f"Fraud check: GPS mismatch for rider {rider_id}")
        score += 30

    # 2. Peer Comparison (25 pts)
    # If the rider's earnings are drastically lower than peers (e.g. they stopped working)
    peer_avg_result = await db.execute(
        select(func.avg(PlatformSnapshot.earnings_current_slot)).where(
            PlatformSnapshot.zone_id == zone_id,
            PlatformSnapshot.time == slot_start,
            PlatformSnapshot.rider_id != rider_id
        )
    )
    peer_avg = peer_avg_result.scalar_one() or 0
    if peer_avg > 0 and actual_earnings < peer_avg / 3:
        logger.warning(f"Fraud check: Earnings < 33% of peers for rider {rider_id}")
        score += 25

    # 3. Baseline Validity (20 pts)
    # Rider should have historical baselines
    baseline_result = await db.execute(
        select(func.count(RiderZoneBaseline.id)).where(RiderZoneBaseline.rider_id == rider_id)
    )
    baseline_count = baseline_result.scalar_one() or 0
    if baseline_count == 0:
        logger.warning(f"Fraud check: No historical baselines for rider {rider_id}")
        score += 20

    # 4. Duplicate Claim (25 pts)
    is_duplicate = await check_duplicate_claim(rider_id, disruption_event_id, db)
    if is_duplicate:
        logger.warning(f"Fraud check: Duplicate claim detected for rider {rider_id}")
        score += 25

    return min(score, 100)
