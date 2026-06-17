import asyncio
import json
import logging
import traceback
from uuid import UUID
from sqlalchemy import select
from shared.database import AsyncSessionLocal
from shared.redis_client import get_redis
from claims_service.models import Claim
from claims_service.service import process_auto_claims

logger = logging.getLogger("zylo.claims_service.consumer")

# Consumer 1: Payout Completed
PAYOUT_STREAM = "stream:payout_completed"
PAYOUT_GROUP = "claims-group"
PAYOUT_CONSUMER = "claims-consumer-1"

# Consumer 2: Disruption Event
DISRUPTION_STREAM = "stream:disruption"
DISRUPTION_GROUP = "claims-disruption-group"
DISRUPTION_CONSUMER = "claims-disruption-consumer-1"


async def process_payout_event(event_type: str, data: dict):
    if event_type == "PayoutCompleted":
        claim_id = data.get("claim_id")
        status = data.get("status")
        logger.info(f"Processing PayoutCompleted for claim {claim_id}, status: {status}")
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Claim).where(Claim.id == UUID(claim_id))
            )
            claim = result.scalar_one_or_none()
            if claim:
                if status == "success":
                    claim.status = "paid"
                else:
                    claim.status = "failed"
                db.add(claim)
                await db.commit()
                logger.info(f"Updated claim {claim.id} status to {claim.status}")
            else:
                logger.error(f"Claim {claim_id} not found to update status")


async def process_disruption_event(event_type: str, data: dict):
    if event_type == "DisruptionEventCreated":
        event_id = data.get("event_id")
        logger.info(f"Processing DisruptionEventCreated for event: {event_id}")
        async with AsyncSessionLocal() as db:
            claims_created = await process_auto_claims(UUID(event_id), db)
            logger.info(f"Generated {claims_created} claims for event {event_id}")


async def start_payout_completed_consumer():
    logger.info("Starting Claims Service payout-completed consumer...")
    redis = await get_redis()
    try:
        await redis.xgroup_create(PAYOUT_STREAM, PAYOUT_GROUP, id="0", mkstream=True)
    except Exception:
        pass
        
    while True:
        try:
            response = await redis.xreadgroup(
                groupname=PAYOUT_GROUP,
                consumername=PAYOUT_CONSUMER,
                streams={PAYOUT_STREAM: ">"},
                count=10,
                block=1000
            )
            if not response:
                await asyncio.sleep(0.5)
                continue
            for stream, messages in response:
                for msg_id, fields in messages:
                    event_id = fields.get("event_id")
                    event_type = fields.get("event_type")
                    raw_data = fields.get("data", "{}")
                    processed_key = f"processed:claims:payout:{event_id}"
                    if await redis.get(processed_key):
                        await redis.xack(PAYOUT_STREAM, PAYOUT_GROUP, msg_id)
                        continue
                    try:
                        data = json.loads(raw_data)
                    except Exception:
                        await redis.xack(PAYOUT_STREAM, PAYOUT_GROUP, msg_id)
                        continue
                    success = False
                    for attempt in range(3):
                        try:
                            await process_payout_event(event_type, data)
                            success = True
                            break
                        except Exception as ex:
                            logger.warning(f"Error handling claim payout event: {ex}")
                            await asyncio.sleep(2 ** attempt)
                    if success:
                        await redis.setex(processed_key, 3600, "1")
                        await redis.xack(PAYOUT_STREAM, PAYOUT_GROUP, msg_id)
                    else:
                        dlq_payload = {"original_stream": PAYOUT_STREAM, "event_id": event_id, "data": raw_data, "error": traceback.format_exc()}
                        await redis.xadd("dlq:stream", dlq_payload)
                        await redis.xack(PAYOUT_STREAM, PAYOUT_GROUP, msg_id)
        except Exception as e:
            logger.error(f"Error in payout completed consumer loop: {e}")
            await asyncio.sleep(5)


async def start_disruption_consumer():
    logger.info("Starting Claims Service disruption consumer...")
    redis = await get_redis()
    try:
        await redis.xgroup_create(DISRUPTION_STREAM, DISRUPTION_GROUP, id="0", mkstream=True)
    except Exception:
        pass
        
    while True:
        try:
            response = await redis.xreadgroup(
                groupname=DISRUPTION_GROUP,
                consumername=DISRUPTION_CONSUMER,
                streams={DISRUPTION_STREAM: ">"},
                count=10,
                block=1000
            )
            if not response:
                await asyncio.sleep(0.5)
                continue
            for stream, messages in response:
                for msg_id, fields in messages:
                    event_id = fields.get("event_id")
                    event_type = fields.get("event_type")
                    raw_data = fields.get("data", "{}")
                    processed_key = f"processed:claims:disruption:{event_id}"
                    if await redis.get(processed_key):
                        await redis.xack(DISRUPTION_STREAM, DISRUPTION_GROUP, msg_id)
                        continue
                    try:
                        data = json.loads(raw_data)
                    except Exception:
                        await redis.xack(DISRUPTION_STREAM, DISRUPTION_GROUP, msg_id)
                        continue
                    success = False
                    for attempt in range(3):
                        try:
                            await process_disruption_event(event_type, data)
                            success = True
                            break
                        except Exception as ex:
                            logger.warning(f"Error handling disruption event: {ex}")
                            await asyncio.sleep(2 ** attempt)
                    if success:
                        await redis.setex(processed_key, 3600, "1")
                        await redis.xack(DISRUPTION_STREAM, DISRUPTION_GROUP, msg_id)
                    else:
                        dlq_payload = {"original_stream": DISRUPTION_STREAM, "event_id": event_id, "data": raw_data, "error": traceback.format_exc()}
                        await redis.xadd("dlq:stream", dlq_payload)
                        await redis.xack(DISRUPTION_STREAM, DISRUPTION_GROUP, msg_id)
        except Exception as e:
            logger.error(f"Error in disruption consumer loop: {e}")
            await asyncio.sleep(5)


async def start_consumer():
    """Start both consumers as background tasks."""
    await asyncio.gather(
        start_payout_completed_consumer(),
        start_disruption_consumer()
    )
