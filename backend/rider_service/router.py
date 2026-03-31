from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from shared.database import get_db
from shared.auth import get_current_rider, verify_token
from rider_service import service
from rider_service.schemas import (
    OTPRequest, OTPResponse, OTPVerifyRequest, OTPVerifyResponse,
    RiderRegisterRequest, RiderProfileResponse, RiskProfileResponse
)
from rider_service.models import RiderRiskProfile, Zone

router = APIRouter()


# ─── POST /send-otp ─────────────────────────────────
@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(request: OTPRequest):
    """Send OTP to phone number (mock)."""
    return await service.send_otp(request.phone)


# ─── POST /verify-otp ───────────────────────────────
@router.post("/verify-otp", response_model=OTPVerifyResponse)
async def verify_otp(request: OTPVerifyRequest):
    """Verify OTP and return a temporary token for registration."""
    result = await service.verify_otp(request.phone, request.otp)
    if not result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_OTP", "message": "Invalid or expired OTP"}
        )
    return result


# ─── POST /register ─────────────────────────────────
@router.post("/register", status_code=201, response_model=RiderProfileResponse)
async def register(
    request: RiderRegisterRequest, 
    authorization: str = Header(..., description="Bearer {temp_token}"),
    db: AsyncSession = Depends(get_db)
):
    """Create rider profile after OTP verification."""
    # 1. Verify temp token
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    if payload.get("role") != "temp":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_INVALID", "message": "Invalid registration token"}
        )
    
    phone = payload.get("sub")
    
    # 2. Check if already registered
    # (Optional: service.py handles this implicitly with DB unique constraint, but iyi to be explicit)
    
    # 3. Call service
    data = request.model_dump()
    data["phone"] = phone
    
    try:
        return await service.register_rider(data, db)
    except Exception as e:
        # Handle duplicate phone or other DB errors
        if "unique constraint" in str(e).lower():
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "DUPLICATE_PHONE", "message": "Phone already registered"}
            )
        raise e


# ─── POST /onboard ──────────────────────────────────
@router.post("/onboard")
async def onboard(data: dict, rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    Generate earnings baseline and get premium quote.
    Calls Dev 2's POST /api/risk/premium internally (MOCK for now).
    """
    # This is a bit of a placeholder until Dev 2 delivers
    return {
        "risk_profile": {
            "zone_risk_score": 72,
            "income_volatility": "high",
            "disruption_probability": 0.65,
            "explanation": "Monsoon season + high-traffic zone"
        },
        "premium_quote": {
            "essential": {"weekly": 120, "coverage": "70%"},
            "balanced": {"weekly": 180, "coverage": "80%"},
            "max_protect": {"weekly": 250, "coverage": "90%"}
        },
        "slot_breakdown": [
            {"slot": "18:00-21:00", "expected_earnings": 360, "risk_score": 75},
            {"slot": "21:00-23:00", "expected_earnings": 240, "risk_score": 68}
        ]
    }


# ─── GET /me ─────────────────────────────────────────
@router.get("/me", response_model=RiderProfileResponse)
async def get_me(rider=Depends(get_current_rider)):
    """Return authenticated rider's full profile."""
    return {
        "rider_id": rider.id,
        "name": rider.name,
        "phone": rider.phone,
        "platform": rider.platform,
        "city": rider.city,
        "zone_id": rider.zone_id,
        "kyc_status": rider.kyc_status,
        "trust_score": rider.trust_score
    }


# ─── GET /me/risk-profile ───────────────────────────
@router.get("/me/risk-profile", response_model=RiskProfileResponse)
async def get_risk_profile(rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """Fetch RiderRiskProfile for this rider."""
    from rider_service.models import RiderZoneBaseline
    
    result = await db.execute(
        select(RiderRiskProfile).where(RiderRiskProfile.rider_id == rider.id)
    )
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Risk profile not found")

    # Fetch zone risks
    zone_result = await db.execute(select(Zone).where(Zone.id == rider.zone_id))
    zone = zone_result.scalar_one_or_none()

    # Fetch avg_per_slot from baselines dynamically instead of stubbing
    baseline_result = await db.execute(
        select(RiderZoneBaseline).where(RiderZoneBaseline.rider_id == rider.id)
    )
    baselines = baseline_result.scalars().all()
    
    avg_per_slot = {b.slot_time: b.avg_earnings for b in baselines}
    if not avg_per_slot:
        avg_per_slot = {"18:00-21:00": 360, "21:00-23:00": 240} # fallback

    return {
        "zone_flood_risk": zone.flood_risk_score if zone else 0,
        "zone_traffic_risk": zone.traffic_risk_score if zone else 0,
        "income_volatility": float(profile.income_volatility),
        "composite_risk_score": zone.composite_risk_score if zone else 0,
        "four_week_earnings": profile.four_week_earnings,
        "avg_per_slot": avg_per_slot
    }

# ─── GET /zones ──────────────────────────────────────
@router.get("/zones")
async def list_zones(db: AsyncSession = Depends(get_db)):
    """List available zones."""
    result = await db.execute(select(Zone))
    zones = result.scalars().all()
    return {"zones": [{"id": str(z.id), "name": z.name, "city": z.city, "risk_score": z.composite_risk_score} for z in zones]}
