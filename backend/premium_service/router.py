"""
Dev 2: Premium/Risk Service Router — STUB

Endpoint:
    POST /api/risk/premium — ML-driven premium calculation
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import get_current_rider

router = APIRouter()


@router.post("/premium")
async def calculate_premium(data: dict, db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 2):
    - Collect features: zone risk, day, hour, tenure, earnings, weather forecast
    - Load LightGBM model from backend/ml/model_artifacts/risk_model.pkl
    - Predict disruption_probability
    - Map to risk_band (low/medium/high/critical)
    - Calculate base_premium × (1 - tenure_discount) × tier_multiplier
    - Return risk_score, premium dict, explanation, breakdown
    """
    return {
        "risk_score": 72,
        "disruption_probability": 0.65,
        "premium": {"essential": 120, "balanced": 180, "max_protect": 250},
        "explanation": "Placeholder — implement ML model",
        "tenure_discount": 0.1,
        "breakdown": [],
    }
