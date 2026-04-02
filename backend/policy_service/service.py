from __future__ import annotations

from typing import TYPE_CHECKING, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

if TYPE_CHECKING:
    from policy_service.models import Policy


async def get_policy_quote(
    rider_id: str,
    slots: List[str],
    db: AsyncSession,
    city: str = "bengaluru"
) -> Dict:
    """
    Generate premium quotes for all 3 tiers for the given rider and slots.
    Called by GET /api/policies/quote
    """
    try:
        from backend.premium_service.service import calculate_premium, get_zone_risk_scores
    except ImportError:
        from premium_service.service import calculate_premium, get_zone_risk_scores

    rider = await get_rider(rider_id, db)
    zone_value = getattr(rider, "zone", city) or city
    zone_name = getattr(zone_value, "name", zone_value) or city

    tenure_days = 90
    if hasattr(rider, "created_at") and rider.created_at:
        from datetime import datetime, timezone

        created_at = rider.created_at
        if getattr(created_at, "tzinfo", None) is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        tenure_days = max((datetime.now(timezone.utc) - created_at).days, 0)

    zone_data = await get_zone_risk_scores(zone_name, db)
    weekly_baseline = await get_rider_weekly_baseline(rider_id, db)

    quotes = []
    for tier in ["essential", "balanced", "max_protect"]:
        result = await calculate_premium(
            zone=zone_name,
            slots=slots,
            plan_tier=tier,
            rider_tenure_days=tenure_days,
            db=db
        )

        coverage_pct = {"essential": 70, "balanced": 80, "max_protect": 90}[tier]
        coverage_limit = int(weekly_baseline * coverage_pct / 100)

        quotes.append({
            "tier": tier,
            "weekly_premium": result["premium"][tier],
            "coverage_pct": coverage_pct,
            "coverage_limit": coverage_limit,
            "slots_covered": len(slots),
            "risk_breakdown": result.get(
                "risk_breakdown",
                {"weather": 50, "traffic": 50, "store": 50}
            )
        })

    from datetime import datetime, timezone

    valid_until = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59)

    return {"quotes": quotes, "valid_until": valid_until}


async def get_rider(rider_id: str, db: AsyncSession):
    """Fetch rider from DB. Import Rider model from Dev 1's module."""
    try:
        from backend.rider_service.models import Rider
    except ImportError:
        from rider_service.models import Rider

    result = await db.execute(select(Rider).where(Rider.id == rider_id))
    rider = result.scalar_one_or_none()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    return rider


async def get_rider_weekly_baseline(rider_id: str, db: AsyncSession) -> int:
    """
    Get rider's weekly earnings baseline from rider_zone_baselines table.
    Falls back to zone median if rider has no history.
    """
    try:
        try:
            from backend.rider_service.models import RiderZoneBaseline
        except ImportError:
            from rider_service.models import RiderZoneBaseline

        result = await db.execute(
            select(RiderZoneBaseline)
            .where(RiderZoneBaseline.rider_id == rider_id)
            .limit(1)
        )
        baseline = result.scalar_one_or_none()
        if baseline and hasattr(baseline, "weekly_earnings"):
            return int(baseline.weekly_earnings)
    except Exception:
        pass
    return 3600


async def create_policy(
    rider_id: str,
    plan_tier: str,
    slots: List[str],
    db: AsyncSession
) -> Policy:
    """
    Create a new active policy for the current calendar week.
    Enforces: one active policy per rider per week.
    """
    try:
        from backend.policy_service.models import Policy, get_current_iso_week, get_week_expiry
    except ImportError:
        from policy_service.models import Policy, get_current_iso_week, get_week_expiry

    try:
        from backend.premium_service.service import calculate_premium
    except ImportError:
        from premium_service.service import calculate_premium

    current_week = get_current_iso_week()

    existing = await db.execute(
        select(Policy).where(
            Policy.rider_id == rider_id,
            Policy.week == current_week,
            Policy.status == "active"
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "DUPLICATE_POLICY",
                "message": f"An active policy already exists for week {current_week}"
            }
        )

    rider = await get_rider(rider_id, db)
    zone_value = getattr(rider, "zone", "bengaluru") or "bengaluru"
    zone_name = getattr(zone_value, "name", zone_value) or "bengaluru"
    tenure_days = 90
    if hasattr(rider, "created_at") and rider.created_at:
        from datetime import datetime, timezone

        created_at = rider.created_at
        if getattr(created_at, "tzinfo", None) is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        tenure_days = max((datetime.now(timezone.utc) - created_at).days, 0)

    premium_data = await calculate_premium(
        zone=zone_name,
        slots=slots,
        plan_tier=plan_tier,
        rider_tenure_days=tenure_days,
        db=db
    )

    weekly_baseline = await get_rider_weekly_baseline(rider_id, db)
    coverage_pct = {"essential": 70, "balanced": 80, "max_protect": 90}[plan_tier]
    coverage_limit = int(weekly_baseline * coverage_pct / 100)

    policy = Policy(
        rider_id=rider_id,
        plan_tier=plan_tier,
        week=current_week,
        premium=premium_data["premium"][plan_tier],
        coverage_limit=coverage_limit,
        coverage_pct=coverage_pct,
        status="active",
        slots_covered=slots,
        coverage_used=0,
        expires_at=get_week_expiry()
    )

    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy


async def get_active_policy(rider_id: str, db: AsyncSession) -> Optional[Policy]:
    try:
        from backend.policy_service.models import Policy
    except ImportError:
        from policy_service.models import Policy

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Policy).where(
            Policy.rider_id == rider_id,
            Policy.status == "active",
            Policy.expires_at > now
        ).order_by(Policy.created_at.desc())
    )
    return result.scalar_one_or_none()


def calculate_hours_remaining(policy: Policy) -> int:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    expires_at = policy.expires_at
    if getattr(expires_at, "tzinfo", None) is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        return 0
    delta = expires_at - now
    return int(delta.total_seconds() // 3600)


async def get_policy_by_id(policy_id: str, rider_id: str, db: AsyncSession) -> Policy:
    try:
        from backend.policy_service.models import Policy
    except ImportError:
        from policy_service.models import Policy

    result = await db.execute(
        select(Policy).where(
            Policy.id == policy_id,
            Policy.rider_id == rider_id
        )
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(
            status_code=404,
            detail={
                "error_code": "POLICY_NOT_FOUND",
                "message": f"Policy {policy_id} not found"
            }
        )
    return policy


async def renew_policy(
    policy_id: str,
    rider_id: str,
    new_tier: Optional[str],
    db: AsyncSession
) -> Dict:
    """
    Renew policy for the NEXT calendar week.
    Re-runs ML model with fresh zone risk data.
    Returns new policy details.
    """
    try:
        from backend.policy_service.models import Policy
    except ImportError:
        from policy_service.models import Policy

    try:
        from backend.premium_service.service import calculate_premium
    except ImportError:
        from premium_service.service import calculate_premium

    from datetime import datetime, timezone, timedelta

    current_policy = await get_policy_by_id(policy_id, rider_id, db)

    if current_policy.status == "cancelled":
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "POLICY_EXPIRED",
                "message": "Cannot renew a cancelled policy"
            }
        )

    current_year, current_week = map(int, current_policy.week.split("-W"))
    next_week_num = current_week + 1
    next_year = current_year
    if next_week_num > 52:
        next_week_num = 1
        next_year += 1
    next_week = f"{next_year}-W{next_week_num:02d}"

    existing = await db.execute(
        select(Policy).where(
            Policy.rider_id == rider_id,
            Policy.week == next_week,
            Policy.status == "active"
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail={
                "error_code": "DUPLICATE_POLICY",
                "message": f"Active policy already exists for {next_week}"
            }
        )

    tier = new_tier or current_policy.plan_tier

    rider = await get_rider(rider_id, db)
    zone_value = getattr(rider, "zone", "bengaluru") or "bengaluru"
    zone_name = getattr(zone_value, "name", zone_value) or "bengaluru"
    tenure_days = 90
    if hasattr(rider, "created_at") and rider.created_at:
        created_at = rider.created_at
        if getattr(created_at, "tzinfo", None) is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        tenure_days = max((datetime.now(timezone.utc) - created_at).days, 0)

    premium_data = await calculate_premium(
        zone=zone_name,
        slots=current_policy.slots_covered or [],
        plan_tier=tier,
        rider_tenure_days=tenure_days,
        db=db
    )

    weekly_baseline = await get_rider_weekly_baseline(rider_id, db)
    coverage_pct = {"essential": 70, "balanced": 80, "max_protect": 90}[tier]
    coverage_limit = int(weekly_baseline * coverage_pct / 100)

    now = datetime.now(timezone.utc)
    days_to_next_sunday = (6 - now.weekday() + 7) % 7 + 7
    next_sunday = now + timedelta(days=days_to_next_sunday)
    next_expiry = next_sunday.replace(hour=23, minute=59, second=59, microsecond=0)

    new_policy = Policy(
        rider_id=rider_id,
        plan_tier=tier,
        week=next_week,
        premium=premium_data["premium"][tier],
        coverage_limit=coverage_limit,
        coverage_pct=coverage_pct,
        status="active",
        slots_covered=current_policy.slots_covered,
        coverage_used=0,
        expires_at=next_expiry
    )

    db.add(new_policy)
    await db.commit()
    await db.refresh(new_policy)

    return {
        "policy_id": str(new_policy.id),
        "previous_policy_id": policy_id,
        "week": next_week,
        "new_premium": new_policy.premium,
        "status": new_policy.status
    }


async def cancel_policy(policy_id: str, rider_id: str, db: AsyncSession) -> None:
    """Cancel an active policy. Sets status to 'cancelled'."""
    policy = await get_policy_by_id(policy_id, rider_id, db)

    if policy.status != "active":
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "POLICY_EXPIRED",
                "message": f"Policy is already {policy.status}"
            }
        )

    policy.status = "cancelled"
    await db.commit()
