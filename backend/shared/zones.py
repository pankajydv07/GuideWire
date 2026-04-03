"""
Zone registry — loads from DB on first access, with hardcoded fallback.

The trigger service, scheduler, and inject endpoint all use these helpers.
"""

import uuid
import asyncio
import logging
from typing import Optional, List, Dict

logger = logging.getLogger("ridershield.zones")

# ── Runtime state ─────────────────────────────────────────────────────────────
_zones: List[Dict] = []
_zone_by_id: Dict[str, Dict] = {}
_zone_by_name: Dict[str, Dict] = {}
_loaded = False

# ── Hardcoded fallback (used if DB is unreachable at import time) ─────────────
_FALLBACK_ZONES = [
    {
        "id": "a1b2c3d4-0001-0001-0001-000000000001",
        "name": "gachibowli", "city": "Hyderabad",
        "lat": 17.4401, "lon": 78.3489, "rider_ids": [],
    },
    {
        "id": "a1b2c3d4-0002-0002-0002-000000000002",
        "name": "koramangala", "city": "Bengaluru",
        "lat": 12.9279, "lon": 77.6271, "rider_ids": [],
    },
    {
        "id": "a1b2c3d4-0003-0003-0003-000000000003",
        "name": "andheri_west", "city": "Mumbai",
        "lat": 19.1288, "lon": 72.8278, "rider_ids": [],
    },
    {
        "id": "a1b2c3d4-0004-0004-0004-000000000004",
        "name": "rajouri_garden", "city": "Delhi",
        "lat": 28.6442, "lon": 77.1194, "rider_ids": [],
    },
]


async def _load_zones_from_db():
    """Load all zones from the Postgres `zones` table + attach rider_ids."""
    global _zones, _zone_by_id, _zone_by_name, _loaded

    try:
        from shared.database import AsyncSessionLocal
        from sqlalchemy import text

        async with AsyncSessionLocal() as db:
            # Load zones
            result = await db.execute(text(
                "SELECT id, name, city, lat, lon, "
                "flood_risk_score, traffic_risk_score, store_risk_score, composite_risk_score "
                "FROM zones ORDER BY city, name"
            ))
            rows = result.fetchall()

            if not rows:
                logger.warning("No zones found in DB — using fallback")
                return

            zones = []
            for row in rows:
                zone_id = str(row[0])
                zone_name = row[1]

                # Get rider_ids that belong to this zone
                rider_result = await db.execute(text(
                    "SELECT id FROM riders WHERE zone_id = :zid"
                ), {"zid": row[0]})
                rider_ids = [str(r[0]) for r in rider_result.fetchall()]

                zones.append({
                    "id": zone_id,
                    "name": zone_name,
                    "city": row[2],
                    "lat": float(row[3]) if row[3] else 0,
                    "lon": float(row[4]) if row[4] else 0,
                    "flood_risk_score": row[5] or 0,
                    "traffic_risk_score": row[6] or 0,
                    "store_risk_score": row[7] or 0,
                    "composite_risk_score": row[8] or 0,
                    "rider_ids": rider_ids,
                })

            _zones = zones
            _zone_by_id = {z["id"]: z for z in _zones}
            _zone_by_name = {z["name"].lower(): z for z in _zones}
            _loaded = True
            logger.info(f"Loaded {len(_zones)} zones from DB "
                        f"({sum(len(z['rider_ids']) for z in _zones)} riders total)")

    except Exception as e:
        logger.error(f"Failed to load zones from DB: {e}")


def _ensure_loaded():
    """Ensure zones are loaded. If not, sync-run the async loader or use fallback."""
    global _zones, _zone_by_id, _zone_by_name, _loaded

    if _loaded:
        return

    # Try async load
    try:
        loop = asyncio.get_running_loop()
        # We're inside an async context — schedule the load
        loop.create_task(_load_zones_from_db())
        # Meanwhile, use fallback until task completes
        if not _zones:
            _zones = _FALLBACK_ZONES[:]
            _zone_by_id = {z["id"]: z for z in _zones}
            _zone_by_name = {z["name"].lower(): z for z in _zones}
    except RuntimeError:
        # No running loop — run synchronously
        try:
            asyncio.run(_load_zones_from_db())
        except Exception:
            if not _zones:
                _zones = _FALLBACK_ZONES[:]
                _zone_by_id = {z["id"]: z for z in _zones}
                _zone_by_name = {z["name"].lower(): z for z in _zones}


async def load_zones():
    """Explicit async loader — call from app lifespan startup."""
    await _load_zones_from_db()
    if not _loaded:
        global _zones, _zone_by_id, _zone_by_name
        _zones = _FALLBACK_ZONES[:]
        _zone_by_id = {z["id"]: z for z in _zones}
        _zone_by_name = {z["name"].lower(): z for z in _zones}


# ── Public API (same as before) ──────────────────────────────────────────────

def get_all_zones() -> List[Dict]:
    _ensure_loaded()
    return _zones


def get_zone(zone_id: str) -> Optional[Dict]:
    _ensure_loaded()
    return _zone_by_id.get(zone_id)


def get_zone_by_name(name: str) -> Optional[Dict]:
    _ensure_loaded()
    return _zone_by_name.get(name.lower())
