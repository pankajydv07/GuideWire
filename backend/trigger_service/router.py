"""
Dev 3: Trigger Service Router — STUB

Endpoints:
    GET  /api/triggers/status
    GET  /api/disruption-events  (mounted under /api/triggers but serves disruptions)
    POST /api/triggers/inject    (demo only)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from shared.database import get_db
from shared.auth import require_admin

router = APIRouter()


@router.get("/status")
async def get_trigger_status(db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 3):
    - Query active triggers from DB
    - Count affected riders per zone
    - Return active_triggers, community_signals, last_evaluation
    """
    return {"active_triggers": [], "community_signals": [], "last_evaluation": None}


@router.get("/disruption-events")
async def list_disruption_events(
    zone: str = Query(default=None),
    from_time: str = Query(default=None, alias="from"),
    db: AsyncSession = Depends(get_db),
):
    """
    TODO (Dev 3):
    - Query disruption_events table with optional zone/time filters
    - Return list of events
    """
    return {"events": []}


@router.post("/inject")
async def inject_trigger(data: dict, admin=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    """
    TODO (Dev 3):
    - Accept trigger_type, zone, and trigger-specific data
    - Create DisruptionEvent immediately (bypass scheduler)
    - Notify Claims Service (Dev 4) to process auto-claims
    - Return event_id + affected_riders count
    
    This is CRITICAL for the demo.
    """
    return {"injected": True, "event_id": "placeholder", "affected_riders": 0}
