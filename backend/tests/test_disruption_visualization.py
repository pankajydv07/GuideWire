import asyncio
import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock, patch

TEST_DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "disruption_visualization.sqlite3",
)
if os.path.exists(TEST_DB_PATH):
    os.remove(TEST_DB_PATH)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from shared.database import Base
from claims_service.models import Claim
from claims_service.service import process_auto_claims
from policy_service.models import Policy
from rider_service.models import Rider, RiderZoneBaseline, Zone
from trigger_service.models import (
    DisruptionEvent,
    DisruptionExecutionStep,
    DisruptionRiderTrace,
    PlatformSnapshot,
)
from trigger_service.service import inject_disruption_event


def _slot_start() -> datetime:
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    return now.replace(hour=19)


async def _seed(session):
    slot_start = _slot_start()
    zone = Zone(
        name="Viz Test Zone",
        city="Delhi",
        flood_risk_score=40,
        traffic_risk_score=45,
        store_risk_score=35,
        composite_risk_score=40,
    )
    session.add(zone)
    await session.flush()

    rider = Rider(
        name="Viz Rider",
        phone=f"9{str(abs(hash(datetime.utcnow().isoformat())))[:9]}",
        platform="zepto",
        city="Delhi",
        zone_id=zone.id,
        kyc_status="verified",
        trust_score=80,
        upi_id="viztest@upi",
    )
    session.add(rider)
    await session.flush()

    week = slot_start.strftime("%Y-W%V")
    session.add(
        Policy(
            rider_id=rider.id,
            plan_tier="balanced",
            week=week,
            premium=100,
            coverage_limit=5000,
            coverage_pct=80,
            coverage_used=0,
            status="active",
            expires_at=slot_start + timedelta(days=7),
        )
    )
    session.add(
        RiderZoneBaseline(
            rider_id=rider.id,
            zone_id=zone.id,
            week=week,
            slot_time="18:00-21:00",
            avg_earnings=700,
            avg_orders=10,
            disruption_count=0,
        )
    )
    session.add(
        PlatformSnapshot(
            time=slot_start,
            rider_id=rider.id,
            zone_id=zone.id,
            earnings_current_slot=100,
            earnings_rolling_baseline=700,
            rider_status="ONLINE",
            platform_status="UP",
            shadowban_active=False,
            shadowban_duration_min=0,
            allocation_anomaly=False,
            curfew_active=False,
            grap_vehicle_ban=False,
            road_blocked=False,
        )
    )
    await session.commit()
    return zone, rider


async def _make_engine():
    isolated_db_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        f"disruption_visualization_{uuid4().hex}.sqlite3",
    )
    engine = create_async_engine(f"sqlite+aiosqlite:///{isolated_db_path}")
    session_local = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine, session_local, isolated_db_path


async def _cleanup(engine, path):
    await engine.dispose()
    if os.path.exists(path):
        os.remove(path)


def test_injected_event_initializes_trace_steps():
    async def _run():
        engine, session_local, path = await _make_engine()
        try:
            async with session_local() as session:
                zone, _rider = await _seed(session)
                with patch("claims_service.service.process_auto_claims", AsyncMock(return_value=0)):
                    event_id = await inject_disruption_event(
                        db=session,
                        trigger_type="heavy_rain",
                        zone_id=str(zone.id),
                        zone_name=zone.name,
                        affected_riders=1,
                        extra_data={"injected": True},
                    )

                event = (
                    await session.execute(select(DisruptionEvent).where(DisruptionEvent.id == event_id))
                ).scalar_one()
                steps = (
                    await session.execute(
                        select(DisruptionExecutionStep).where(
                            DisruptionExecutionStep.disruption_event_id == event_id
                        )
                    )
                ).scalars().all()

                assert event.source == "admin_injected"
                assert event.processing_status == "processing"
                assert {step.step_key for step in steps} == {
                    "triggered",
                    "detected",
                    "riders_identified",
                    "verification",
                    "payout",
                }
                completed = {step.step_key for step in steps if step.status == "completed"}
                assert {"triggered", "detected"}.issubset(completed)
        finally:
            await _cleanup(engine, path)

    asyncio.run(_run())


def test_auto_claim_trace_marks_flagged_rider_blocked():
    async def _run():
        engine, session_local, path = await _make_engine()
        try:
            async with session_local() as session:
                zone, rider = await _seed(session)
                slot_start = _slot_start()
                event = DisruptionEvent(
                    trigger_type="heavy_rain",
                    zone_id=zone.id,
                    zone_name=zone.name,
                    slot_start=slot_start,
                    slot_end=slot_start + timedelta(hours=3),
                    severity="high",
                    affected_riders=1,
                    source="scheduler",
                    processing_status="processing",
                )
                session.add(event)
                await session.flush()
                for step_key, status in [
                    ("triggered", "completed"),
                    ("detected", "completed"),
                    ("riders_identified", "pending"),
                    ("verification", "pending"),
                    ("payout", "pending"),
                ]:
                    session.add(
                        DisruptionExecutionStep(
                            disruption_event_id=event.id,
                            step_key=step_key,
                            status=status,
                        )
                    )
                await session.commit()

                with (
                    patch("claims_service.service.run_fraud_check", AsyncMock(return_value=75)),
                    patch("claims_service.service.process_upi_payout", AsyncMock()) as payout_mock,
                ):
                    created = await process_auto_claims(event.id, session)

                claim = (
                    await session.execute(select(Claim).where(Claim.rider_id == rider.id))
                ).scalar_one()
                trace = (
                    await session.execute(
                        select(DisruptionRiderTrace).where(
                            DisruptionRiderTrace.disruption_event_id == event.id,
                            DisruptionRiderTrace.rider_id == rider.id,
                        )
                    )
                ).scalar_one()
                event = (
                    await session.execute(select(DisruptionEvent).where(DisruptionEvent.id == event.id))
                ).scalar_one()

                assert created == 1
                assert claim.status == "flagged"
                assert trace.verification_result == "fail"
                assert trace.payout_status == "blocked"
                assert trace.processing_stage == "fraud_flagged"
                assert event.processing_status == "completed"
                payout_mock.assert_not_called()
        finally:
            await _cleanup(engine, path)

    asyncio.run(_run())
