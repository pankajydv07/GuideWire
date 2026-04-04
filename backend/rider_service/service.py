import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import create_temp_token, create_access_token
from rider_service.models import Rider, RiderRiskProfile, RiderZoneBaseline, Zone
from rider_service.otp_provider import send_otp_code, verify_otp_code

# ─── Service Logic ────────────────────────────────────

async def send_otp(phone: str) -> dict:
    """Generate and dispatch a free/demo OTP."""
    return await send_otp_code(phone)


async def verify_otp(phone: str, otp: str, db: AsyncSession) -> dict:
    """Verify OTP, logging in existing riders directly and onboarding new riders with a temp token."""
    valid, error_code = await verify_otp_code(phone, otp)

    if not valid:
        return {"valid": False, "temp_token": None, "error": error_code or "INVALID_OTP"}

    rider_result = await db.execute(select(Rider).where(Rider.phone == phone))
    rider = rider_result.scalar_one_or_none()
    if rider:
        return {
            "valid": True,
            "temp_token": None,
            "jwt_token": create_access_token(data={"sub": str(rider.id), "role": "rider"}),
            "is_registered": True,
            "error": None,
        }

    return {
        "valid": True,
        "temp_token": create_temp_token(phone),
        "jwt_token": None,
        "is_registered": False,
        "error": None,
    }



async def register_rider(data: dict, db: AsyncSession) -> dict:
    """
    Finalize registration: Create Rider and RiderRiskProfile.
    Expected data: {name, platform, city, zone_id, slots, upi_id, phone}
    """
    # 1. Create Rider
    rider = Rider(
        phone=data["phone"],
        name=data["name"],
        platform=data["platform"],
        city=data["city"],
        zone_id=data["zone_id"],
        upi_id=data.get("upi_id"),
        kyc_status="verified",  # Auto-verify for demo
        trust_score=85          # Starter score
    )
    db.add(rider)
    await db.flush()  # Get rider.id

    # 2. Create Risk Profile (stubs for now, Dev 2 will enhance)
    risk_profile = RiderRiskProfile(
        rider_id=rider.id,
        zone_id=rider.zone_id,
        income_volatility=0.45,
        disruption_probability=0.20,
        four_week_earnings={
            "week_12": 4250, "week_11": 4100,
            "week_10": 3800, "week_9": 4450
        }
    )
    db.add(risk_profile)

    # 3. Generate initial baselines
    await generate_baseline(rider.id, rider.zone_id, data["slots"], db)

    await db.commit()
    await db.refresh(rider)

    # 4. Generate long-lived JWT
    token = create_access_token(data={"sub": str(rider.id), "role": "rider"})

    return {
        "rider_id": rider.id,
        "name": rider.name,
        "phone": rider.phone,
        "city": rider.city,
        "platform": rider.platform,
        "zone_id": rider.zone_id,
        "kyc_status": rider.kyc_status,
        "trust_score": rider.trust_score,
        "jwt_token": token
    }


async def generate_baseline(rider_id: uuid.UUID, zone_id: uuid.UUID, slots: list, db: AsyncSession):
    """Generate dummy earnings baselines for demo purposes."""
    current_week = datetime.now().strftime("%Y-W%V")
    
    for slot in slots:
        baseline = RiderZoneBaseline(
            rider_id=rider_id,
            zone_id=zone_id,
            week=current_week,
            slot_time=slot,
            avg_earnings=350,  # Placeholder avg
            avg_orders=12      # Placeholder avg
        )
        db.add(baseline)
