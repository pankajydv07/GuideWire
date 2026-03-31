"""
Dev 1: Rider Service Router — STUB

Endpoints:
    POST /api/riders/send-otp
    POST /api/riders/verify-otp
    POST /api/riders/register
    POST /api/riders/onboard
    GET  /api/riders/me
    GET  /api/riders/me/risk-profile

Dev 1: Fill in the implementation. The route signatures and
response models are defined — implement the service logic.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_rider

router = APIRouter()


# ─── POST /send-otp ─────────────────────────────────
@router.post("/send-otp")
async def send_otp(phone: dict):
    """
    TODO (Dev 1):
    - Validate phone format
    - Generate mock OTP "123456"
    - Store in Redis: SET otp:{phone} "123456" EX 300
    - Return {"message": "OTP sent", "expires_in": 300}
    """
    return {"message": "OTP sent", "expires_in": 300}


# ─── POST /verify-otp ───────────────────────────────
@router.post("/verify-otp")
async def verify_otp(data: dict):
    """
    TODO (Dev 1):
    - GET otp:{phone} from Redis
    - Compare with submitted OTP
    - If match: delete OTP, return temp_token
    - If mismatch: return 400 INVALID_OTP
    """
    return {"valid": True, "temp_token": "placeholder"}


# ─── POST /register ─────────────────────────────────
@router.post("/register", status_code=201)
async def register(data: dict, db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 1):
    - Verify temp_token from header
    - Create Rider record in DB
    - Create RiderRiskProfile
    - Generate JWT token
    - Return rider profile + jwt_token
    """
    return {"rider_id": "placeholder", "message": "implement me"}


# ─── POST /onboard ──────────────────────────────────
@router.post("/onboard")
async def onboard(data: dict, rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 1):
    - Generate earnings baseline for rider
    - Call Dev 2's POST /api/risk/premium to get quote
    - Return risk_profile + premium_quote + slot_breakdown
    """
    return {"message": "implement me"}


# ─── GET /me ─────────────────────────────────────────
@router.get("/me")
async def get_me(rider=Depends(get_current_rider)):
    """
    TODO (Dev 1):
    - Return authenticated rider's full profile
    """
    return {"rider_id": str(rider.id), "name": rider.name}


# ─── GET /me/risk-profile ───────────────────────────
@router.get("/me/risk-profile")
async def get_risk_profile(rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 1):
    - Fetch RiderRiskProfile for this rider
    - Include zone risk scores + 4-week earnings + avg_per_slot
    """
    return {"message": "implement me"}
