import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import OperationalError, ProgrammingError

from trigger_service.models import DisruptionEvent, DisruptionExecutionStep, DisruptionRiderTrace

LIFECYCLE_STEPS = (
    "triggered",
    "detected",
    "riders_identified",
    "verification",
    "payout",
)


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def initialize_event_trace(
    db: AsyncSession,
    disruption_event_id: uuid.UUID,
    source: str,
) -> None:
    try:
        now = _utc_now_naive()
        for step_key in LIFECYCLE_STEPS:
            if step_key in {"triggered", "detected"}:
                status = "completed"
                started_at = now
                completed_at = now
                meta = {"source": source}
            else:
                status = "pending"
                started_at = None
                completed_at = None
                meta = None
            db.add(
                DisruptionExecutionStep(
                    disruption_event_id=disruption_event_id,
                    step_key=step_key,
                    status=status,
                    started_at=started_at,
                    completed_at=completed_at,
                    meta_json=meta,
                )
            )
        await db.flush()
    except (OperationalError, ProgrammingError):
        await db.rollback()


async def upsert_step(
    db: AsyncSession,
    disruption_event_id: uuid.UUID,
    step_key: str,
    *,
    status: str,
    meta: dict | None = None,
) -> DisruptionExecutionStep:
    try:
        result = await db.execute(
            select(DisruptionExecutionStep).where(
                DisruptionExecutionStep.disruption_event_id == disruption_event_id,
                DisruptionExecutionStep.step_key == step_key,
            )
        )
        step = result.scalar_one_or_none()
        now = _utc_now_naive()
        if not step:
            step = DisruptionExecutionStep(
                disruption_event_id=disruption_event_id,
                step_key=step_key,
            )
            db.add(step)
        if status == "in_progress" and not step.started_at:
            step.started_at = now
        if status in {"completed", "failed"}:
            step.started_at = step.started_at or now
            step.completed_at = now
        step.status = status
        if meta is not None:
            step.meta_json = meta
        await db.flush()
        return step
    except (OperationalError, ProgrammingError):
        await db.rollback()
        return DisruptionExecutionStep(
            disruption_event_id=disruption_event_id,
            step_key=step_key,
            status=status,
        )


async def update_event_processing_status(
    db: AsyncSession,
    disruption_event_id: uuid.UUID,
    status: str,
) -> None:
    try:
        result = await db.execute(
            select(DisruptionEvent).where(DisruptionEvent.id == disruption_event_id)
        )
        event = result.scalar_one_or_none()
        if event:
            event.processing_status = status
            await db.flush()
    except (OperationalError, ProgrammingError):
        await db.rollback()


async def create_rider_trace(
    db: AsyncSession,
    disruption_event_id: uuid.UUID,
    rider_id: uuid.UUID,
    zone_id: uuid.UUID,
    *,
    processing_stage: str = "detected",
    verification_result: str = "pending",
    payout_status: str | None = None,
    trace_json: dict | None = None,
) -> DisruptionRiderTrace:
    try:
        trace = DisruptionRiderTrace(
            disruption_event_id=disruption_event_id,
            rider_id=rider_id,
            zone_id=zone_id,
            processing_stage=processing_stage,
            verification_result=verification_result,
            payout_status=payout_status,
            trace_json=trace_json,
        )
        db.add(trace)
        await db.flush()
        return trace
    except (OperationalError, ProgrammingError):
        await db.rollback()
        return DisruptionRiderTrace(
            disruption_event_id=disruption_event_id,
            rider_id=rider_id,
            zone_id=zone_id,
            processing_stage=processing_stage,
            verification_result=verification_result,
            payout_status=payout_status,
            trace_json=trace_json,
        )


async def persist_trace_state(db: AsyncSession) -> None:
    try:
        await db.flush()
        await db.commit()
    except (OperationalError, ProgrammingError):
        await db.rollback()
