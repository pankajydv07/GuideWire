"""
Dev 5: Manual Claims Router — STUB

Endpoints:
    POST /api/claims/manual       — submit manual claim with photo
    GET  /api/claims/manual/{id}  — check manual claim status
"""

from uuid import UUID
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_rider

router = APIRouter()


@router.post("", status_code=201)
async def submit_manual_claim(
    disruption_type: str = Form(...),
    description: str = Form(""),
    incident_time: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    photo: UploadFile = File(...),
    rider=Depends(get_current_rider),
    db: AsyncSession = Depends(get_db),
):
    """
    TODO (Dev 5):
    1. Validate rider has active policy
    2. Check rate limit (1 manual claim per policy week)
    3. Save photo to UPLOAD_DIR
    4. Extract EXIF GPS + timestamp from photo
    5. Compare photo GPS vs rider's (latitude, longitude) → haversine distance
    6. Query Dev 3's weather_data for corroboration
    7. Query Dev 3's traffic data for corroboration
    8. Calculate spam_score
    9. If spam_score >= 70: auto-reject, return status="rejected"
    10. If spam_score < 70: call Dev 4's process_manual_claim()
    11. Return claim details with geo_validation + corroboration
    """
    return {"claim_id": "placeholder", "status": "under_review", "spam_score": 0}


@router.get("/{claim_id}")
async def get_manual_claim_status(claim_id: UUID, rider=Depends(get_current_rider), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 5):
    - Fetch manual claim by ID
    - Verify rider ownership
    - Return status, payout_amount, reviewer_notes
    """
    return {"message": "implement me"}
