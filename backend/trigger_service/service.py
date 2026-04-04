"""
Trigger Service — core business logic.

Evaluates public/mock automated parametric triggers against live data snapshots:
  1. Heavy Rain          rainfall_mm > 40
  2. Extreme Heat        heat index > threshold
  3. Traffic Congestion  congestion_index > 80 for 60+ min
  4. Dark Store Closure  store_status = CLOSED
  5. Platform Outage     platform_status = DOWN
  6. Regulatory Curfew   curfew_active = TRUE
  7. GPS Shadowban       shadowban flag + duration anomaly
  8. Dark Store Queue    pickup wait and queue SLA breach
  9. Algorithmic Shock   allocation anomaly + order-rate collapse

Three-Factor Validation Gate:
  A DisruptionEvent is created ONLY when ALL 3 conditions are met:
  1. Trigger condition is TRUE
  2. Rider is ONLINE and in-zone (platform_status = ONLINE)
  3. Actual earnings fall below the rolling baseline

Also detects Community Signal: >70% of zone riders see order collapse.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from trigger_service.models import DisruptionEvent, WeatherData, PlatformSnapshot
from shared.zones import get_zone_by_name, get_all_zones

# ─── In-memory trigger state ──────────────────────────────────────────────────
# Tracks how long a trigger has been active (for sustained-duration checks)
_trigger_active_since: dict[str, datetime] = {}   # key: "trigger_type:zone_id"
_active_triggers_cache: list[dict] = []            # filled each scheduler cycle
_community_signals_cache: list[dict] = []
_last_evaluation: Optional[datetime] = None

# Dedup: zone+trigger+slot already created
_created_events: set[str] = set()   # "zone_id:trigger_type:slot_start_iso"


# ─── Trigger threshold constants ──────────────────────────────────────────────
RAIN_THRESHOLD_MM     = 40.0     # > 40mm / 1hr
HEAT_INDEX_THRESHOLD  = 32.0    # wet-bulb > 32°C
CONGESTION_THRESHOLD  = 80      # > 80/100
CONGESTION_DURATION   = 55      # minutes sustained (rounds run every 5 min)
COMMUNITY_PCT         = 0.70    # > 70% riders affected
EARNINGS_DROP_PCT     = 20.0    # must drop ≥ 20% vs baseline
SHADOWBAN_DURATION    = 30      # minutes
QUEUE_WAIT_THRESHOLD  = 300     # 5 min pickup wait SLA breach
QUEUE_DEPTH_THRESHOLD = 12
ALGO_DROP_THRESHOLD   = 50.0


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _slot_now() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    start = now - timedelta(minutes=now.minute % 30, seconds=now.second)
    return start, start + timedelta(minutes=30)


def _dedup_key(zone_id: str, trigger_type: str, slot_start: datetime) -> str:
    return f"{zone_id}:{trigger_type}:{slot_start.isoformat()}"


def _trigger_key(trigger_type: str, zone_id: str) -> str:
    return f"{trigger_type}:{zone_id}"


# ─── Three-Factor Validation ───────────────────────────────────────────────────
def _three_factor_valid(snap: dict) -> bool:
    """
    True only when:
    1. Rider is ONLINE (factor 2 — in-zone confirmed by platform_status)
    2. Earnings drop ≥ threshold vs rolling baseline (factor 3)
    (Factor 1 is the trigger condition itself, checked by caller.)
    """
    if snap.get("rider_status") != "ONLINE":
        return False
    baseline = snap.get("earnings_rolling_baseline", 0) or 1
    current  = snap.get("earnings_current_slot", 0) or 0
    drop     = (baseline - current) / baseline * 100
    return drop >= EARNINGS_DROP_PCT


# ─── Per-trigger evaluators ───────────────────────────────────────────────────
def eval_heavy_rain(weather: dict, zone: dict) -> Optional[dict]:
    rain = weather.get("rainfall_mm", 0) or 0
    if rain > RAIN_THRESHOLD_MM:
        return {
            "trigger_type": "heavy_rain",
            "severity":     "high",
            "threshold":    f"{rain:.1f}mm/1hr > {RAIN_THRESHOLD_MM}mm",
            "data":         {"rainfall_mm": rain, "temperature": weather.get("temperature")},
        }
    return None


def eval_heat(weather: dict, zone: dict) -> Optional[dict]:
    hi = weather.get("heat_index") or 0
    temp = weather.get("temperature") or 0
    if hi > HEAT_INDEX_THRESHOLD or temp > 42:
        return {
            "trigger_type": "extreme_heat",
            "severity":     "medium",
            "threshold":    f"heat_index={hi}°C or temp={temp}°C > 42°C",
            "data":         {"heat_index": hi, "temperature": temp},
        }
    return None


def eval_traffic(snap: dict, zone: dict) -> Optional[dict]:
    ci = snap.get("congestion_index", 0) or 0
    rb = snap.get("road_blocked", False)
    tk = _trigger_key("traffic_congestion", zone["id"])

    if ci > CONGESTION_THRESHOLD or rb:
        if tk not in _trigger_active_since:
            _trigger_active_since[tk] = datetime.now(timezone.utc)
        elapsed = (datetime.now(timezone.utc) - _trigger_active_since[tk]).total_seconds() / 60
        if elapsed >= CONGESTION_DURATION or rb:
            return {
                "trigger_type": "traffic_congestion",
                "severity":     "medium",
                "threshold":    f"congestion={ci}/100 road_blocked={rb}",
                "data":         {"congestion_index": ci, "road_blocked": rb, "elapsed_min": elapsed},
            }
        return None   # not yet sustained
    else:
        _trigger_active_since.pop(tk, None)
        return None


def eval_store_closure(snap: dict, zone: dict) -> Optional[dict]:
    if snap.get("store_status") == "CLOSED":
        return {
            "trigger_type": "store_closure",
            "severity":     "high",
            "threshold":    "store_status=CLOSED",
            "data":         {"store_status": "CLOSED", "stock_level": snap.get("stock_level")},
        }
    return None


def eval_platform_outage(snap: dict, zone: dict) -> Optional[dict]:
    if snap.get("platform_status") == "DOWN":
        return {
            "trigger_type": "platform_outage",
            "severity":     "critical",
            "threshold":    "platform_status=DOWN",
            "data":         {"platform_status": "DOWN"},
        }
    return None


def eval_curfew(snap: dict, zone: dict) -> Optional[dict]:
    if snap.get("curfew_active"):
        return {
            "trigger_type": "regulatory_curfew",
            "severity":     "critical",
            "threshold":    "curfew_active=TRUE",
            "data":         {"curfew_active": True},
        }
    return None


def eval_gps_shadowban(snap: dict, zone: dict) -> Optional[dict]:
    duration = snap.get("shadowban_duration_min", 0) or 0
    if snap.get("shadowban_active") and (duration >= SHADOWBAN_DURATION or snap.get("allocation_anomaly")):
        return {
            "trigger_type": "gps_shadowban",
            "severity":     "medium",
            "threshold":    f"shadowban_active=TRUE duration={duration}min",
            "data":         {
                "shadowban_duration_min": duration,
                "allocation_anomaly": snap.get("allocation_anomaly", False),
            },
        }
    return None


def eval_dark_store_queue(snap: dict, zone: dict) -> Optional[dict]:
    wait_sec = snap.get("avg_pickup_wait_sec", 0) or 0
    queue_depth = snap.get("pickup_queue_depth", 0) or 0
    if wait_sec >= QUEUE_WAIT_THRESHOLD and queue_depth >= QUEUE_DEPTH_THRESHOLD:
        return {
            "trigger_type": "dark_store_queue",
            "severity":     "low",
            "threshold":    f"wait={wait_sec}s queue_depth={queue_depth}",
            "data":         {
                "avg_pickup_wait_sec": wait_sec,
                "pickup_queue_depth": queue_depth,
                "store_status": snap.get("store_status"),
            },
        }
    return None


def eval_algorithmic_shock(snap: dict, zone: dict) -> Optional[dict]:
    drop_pct = snap.get("order_rate_drop_pct", 0) or 0
    if snap.get("allocation_anomaly") and drop_pct >= ALGO_DROP_THRESHOLD:
        return {
            "trigger_type": "algorithmic_shock",
            "severity":     "medium",
            "threshold":    f"allocation_anomaly=TRUE order_drop={drop_pct:.1f}%",
            "data":         {
                "order_rate_drop_pct": drop_pct,
                "orders_per_hour": snap.get("orders_per_hour"),
                "dispatch_latency_sec": snap.get("dispatch_latency_sec"),
            },
        }
    return None


# ─── Community Signal ──────────────────────────────────────────────────────────
def eval_community_signal(snapshots: list[dict], zone: dict) -> Optional[dict]:
    total = len(snapshots)
    if total == 0:
        return None
    affected = sum(
        1 for s in snapshots
        if (s.get("order_rate_drop_pct") or 0) >= 40
    )
    pct = affected / total * 100
    if pct > COMMUNITY_PCT * 100:
        return {
            "zone":            zone["name"],
            "zone_id":         zone["id"],
            "affected_pct":    round(pct, 1),
            "threshold_pct":   COMMUNITY_PCT * 100,
            "affected_riders": affected,
            "total_riders":    total,
            "detected_at":     datetime.now(timezone.utc),
        }
    return None


# ─── Main evaluation loop (called by scheduler) ───────────────────────────────
async def evaluate_all_zones(db: AsyncSession, weather_map: dict, snapshot_map: dict):
    """
    weather_map:   zone_id → weather dict
    snapshot_map:  zone_id → list[rider_snapshot dict]

    Creates DisruptionEvent rows in DB for every valid trigger that passes
    the three-factor gate.  Deduplicates by zone+trigger+slot.
    """
    global _active_triggers_cache, _community_signals_cache, _last_evaluation

    new_active  = []
    new_signals = []
    slot_start, slot_end = _slot_now()

    for zone in get_all_zones():
        zid    = zone["id"]
        zname  = zone["name"]
        snaps  = snapshot_map.get(zid, [])
        weather= weather_map.get(zid, {})

        # ── Weather triggers (zone-level, no per-rider gate) ──────────────────
        for eval_fn in (eval_heavy_rain, eval_heat):
            result = eval_fn(weather, zone)
            if result:
                dk = _dedup_key(zid, result["trigger_type"], slot_start)
                if dk not in _created_events:
                    affected = len([s for s in snaps if s.get("rider_status") == "ONLINE"])
                    event_id = await _create_event(
                        db, result, zid, zname, slot_start, slot_end, affected
                    )
                    _created_events.add(dk)
                    new_active.append({
                        "trigger_id":      str(event_id),
                        "type":            result["trigger_type"],
                        "zone":            zname,
                        "zone_id":         zid,
                        "threshold":       result["threshold"],
                        "active_since":    datetime.now(timezone.utc),
                        "affected_riders": affected,
                        "severity":        result["severity"],
                    })

        # ── Rider-level triggers (need three-factor gate) ─────────────────────
        rider_trigger_counts: dict[str, int] = {}

        for snap in snaps:
            for eval_fn in (
                eval_traffic,
                eval_store_closure,
                eval_platform_outage,
                eval_curfew,
                eval_gps_shadowban,
                eval_dark_store_queue,
                eval_algorithmic_shock,
            ):
                result = eval_fn(snap, zone)
                if result:
                    if _three_factor_valid(snap):
                        ttype = result["trigger_type"]
                        rider_trigger_counts[ttype] = rider_trigger_counts.get(ttype, 0) + 1

        for ttype, count in rider_trigger_counts.items():
            dk = _dedup_key(zid, ttype, slot_start)
            if dk not in _created_events:
                # Rebuild result dict from a relevant snap
                if not snaps: continue
                sample_snap = snaps[0]
                result_data = {
                    "trigger_type": ttype,
                    "severity":     _severity_for(ttype),
                    "threshold":    _threshold_for(ttype, sample_snap),
                    "data":         {"affected_count": count},
                }
                event_id = await _create_event(
                    db, result_data, zid, zname, slot_start, slot_end, count
                )
                _created_events.add(dk)
                new_active.append({
                    "trigger_id":      str(event_id),
                    "type":            ttype,
                    "zone":            zname,
                    "zone_id":         zid,
                    "threshold":       result_data["threshold"],
                    "active_since":    datetime.now(timezone.utc),
                    "affected_riders": count,
                    "severity":        result_data["severity"],
                })

        # ── Community signal ───────────────────────────────────────────────────
        sig = eval_community_signal(snaps, zone)
        if sig:
            new_signals.append(sig)
            # Also persist as a disruption event
            dk = _dedup_key(zid, "community_signal", slot_start)
            if dk not in _created_events:
                event_id = await _create_event(
                    db,
                    {"trigger_type": "community_signal", "severity": "high",
                     "threshold": f">{COMMUNITY_PCT*100:.0f}% riders affected",
                     "data": sig},
                    zid, zname, slot_start, slot_end, sig["affected_riders"]
                )
                _created_events.add(dk)

    _active_triggers_cache  = new_active
    _community_signals_cache = new_signals
    _last_evaluation = datetime.now(timezone.utc)


# ─── Instant injection (used by demo endpoint) ────────────────────────────────
async def inject_disruption_event(
    db: AsyncSession,
    trigger_type: str,
    zone_id: str,
    zone_name: str,
    affected_riders: int,
    extra_data: dict,
) -> uuid.UUID:
    slot_start, slot_end = _slot_now()
    severity = _severity_for(trigger_type)
    result = {
        "trigger_type": trigger_type,
        "severity":     severity,
        "threshold":    str(extra_data),
        "data":         extra_data,
    }
    event_id = await _create_event(
        db, result, zone_id, zone_name, slot_start, slot_end, affected_riders
    )
    # Update active cache
    _active_triggers_cache.append({
        "trigger_id":      str(event_id),
        "type":            trigger_type,
        "zone":            zone_name,
        "zone_id":         zone_id,
        "threshold":       str(extra_data),
        "active_since":    datetime.now(timezone.utc),
        "affected_riders": affected_riders,
        "severity":        severity,
    })
    return event_id


# ─── DB writer ────────────────────────────────────────────────────────────────
async def _create_event(
    db: AsyncSession,
    result: dict,
    zone_id: str,
    zone_name: str,
    slot_start: datetime,
    slot_end: datetime,
    affected_riders: int,
) -> uuid.UUID:
    event_id = uuid.uuid4()
    # Convert zone_id string to UUID if needed
    z_id = uuid.UUID(zone_id) if isinstance(zone_id, str) else zone_id
    
    # Strip tzinfo for postgres without timezone
    if slot_start and slot_start.tzinfo:
        slot_start = slot_start.replace(tzinfo=None)
    if slot_end and slot_end.tzinfo:
        slot_end = slot_end.replace(tzinfo=None)
        
    event = DisruptionEvent(
        id            = event_id,
        trigger_type  = result["trigger_type"],
        zone_id       = z_id,
        zone_name     = zone_name,
        slot_start    = slot_start,
        slot_end      = slot_end,
        severity      = result["severity"],
        data_json     = result.get("data"),
        affected_riders = affected_riders,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    claims_created = 0
    try:
        from claims_service.service import process_auto_claims

        claims_created = await process_auto_claims(event_id, db)
    except Exception as exc:
        print(f"[TriggerService] Auto-claims failed for event {event_id}: {exc}")
    print(f"[TriggerService] ✅ DisruptionEvent created: {result['trigger_type']} @ {zone_name} "
          f"({claims_created} claims anchored)")
    return event_id


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _severity_for(trigger_type: str) -> str:
    return {
        "heavy_rain":        "high",
        "extreme_heat":      "medium",
        "traffic_congestion":"medium",
        "store_closure":     "high",
        "platform_outage":   "critical",
        "regulatory_curfew": "critical",
        "community_signal":  "high",
        "gps_shadowban":     "medium",
        "dark_store_queue":  "low",
        "algorithmic_shock": "medium",
    }.get(trigger_type, "medium")


def _threshold_for(trigger_type: str, snap: dict) -> str:
    return {
        "traffic_congestion": f"congestion={snap.get('congestion_index')}/100",
        "store_closure":      "store_status=CLOSED",
        "platform_outage":    "platform_status=DOWN",
        "regulatory_curfew":  "curfew_active=TRUE",
        "gps_shadowban":      f"shadowban_duration={snap.get('shadowban_duration_min')}min",
        "dark_store_queue":   f"wait={snap.get('avg_pickup_wait_sec')}s>300s",
        "algorithmic_shock":  f"order_drop={snap.get('order_rate_drop_pct')}%",
    }.get(trigger_type, "—")


# ─── Cache reads (used by router) ──────────────────────────────────────────────
def get_active_triggers() -> list:
    return _active_triggers_cache


def get_community_signals() -> list:
    return _community_signals_cache


def get_last_evaluation() -> Optional[datetime]:
    return _last_evaluation

async def check_historical_conditions(zone_id: str, incident_time: datetime, db: AsyncSession) -> dict:
    """Historical corroboration for manual claims."""
    # Convert zone_id string to UUID if needed
    import uuid
    from datetime import timedelta
    z_id = uuid.UUID(zone_id) if isinstance(zone_id, str) else zone_id
    
    # Check weather data within +/- 30 minutes
    start_time = incident_time - timedelta(minutes=30)
    end_time = incident_time + timedelta(minutes=30)
    
    # Weather
    weather_stmt = select(WeatherData).where(
        WeatherData.zone_id == z_id,
        WeatherData.time >= start_time,
        WeatherData.time <= end_time,
        WeatherData.rainfall_mm > RAIN_THRESHOLD_MM
    ).limit(1)
    weather_res = await db.execute(weather_stmt)
    has_weather = bool(weather_res.scalar_one_or_none())
    
    # Traffic (Platform Snapshots)
    traffic_stmt = select(PlatformSnapshot).where(
        PlatformSnapshot.zone_id == z_id,
        PlatformSnapshot.time >= start_time,
        PlatformSnapshot.time <= end_time,
        PlatformSnapshot.congestion_index > CONGESTION_THRESHOLD
    ).limit(1)
    traffic_res = await db.execute(traffic_stmt)
    has_traffic = bool(traffic_res.scalar_one_or_none())
    
    return {"weather": has_weather, "traffic": has_traffic}
