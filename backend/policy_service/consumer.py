import asyncio
import json
import logging
import traceback
from sqlalchemy import select
from shared.database import AsyncSessionLocal
from shared.redis_client import get_redis
from policy_service.models import Policy

logger = logging.getLogger("zylo.policy_service.consumer")
STREAM_NAME = "stream:payout"
GROUP_NAME = "policy-group"
CONSUMER_NAME = "policy-consumer-1"

async def process_event(event_type: str, data: dict):
    """Handle incoming payout events to update policy coverage_used."""
    if event_type == "PayoutTriggered":
        claim_id = data.get("claim_id")
        amount = int(data.get("amount", 0))
        rider_id = data.get("rider_id")
        
        logger.info(f"Processing PayoutTriggered for rider {rider_id}, amount {amount}")
        
        async with AsyncSessionLocal() as db:
            # Import claims service models to find policy associated with claim
            from claims_service.models import Claim
            claim_result = await db.execute(
                select(Claim).where(Claim.id == claim_id)
            )
            claim = claim_result.scalar_one_or_none()
            if not claim:
                logger.error(f"Claim {claim_id} not found to update policy coverage")
                return
            
            policy_result = await db.execute(
                select(Policy).where(Policy.id == claim.policy_id)
            )
            policy = policy_result.scalar_one_or_none()
            if policy:
                policy.coverage_used += amount
                db.add(policy)
                await db.commit()
                logger.info(f"Updated policy {policy.id} coverage_used by {amount}")
                
                # Evict from Redis Cache to ensure consistency
                redis = await get_redis()
                await redis.delete(f"policy:active:{rider_id}")
            else:
                logger.error(f"Policy {claim.policy_id} not found for claim {claim_id}")

async def start_consumer():
    """Start the Redis Stream consumer loop with retries and DLQ."""
    logger.info("Starting Policy Service background consumer...")
    redis = await get_redis()
    
    # Ensure stream and group exist
    try:
        await redis.xgroup_create(STREAM_NAME, GROUP_NAME, id="0", mkstream=True)
    except Exception:
        # Group already exists
        pass
        
    while True:
        try:
            # Read messages from group
            # streams mapping stream name to '>' (unread messages)
            response = await redis.xreadgroup(
                groupname=GROUP_NAME,
                consumername=CONSUMER_NAME,
                streams={STREAM_NAME: ">"},
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
                    
                    logger.info(f"Received event {event_type} (ID: {event_id})")
                    
                    # Idempotency check: check if event has already been processed
                    processed_key = f"processed:policy:{event_id}"
                    is_processed = await redis.get(processed_key)
                    if is_processed:
                        logger.info(f"Event {event_id} already processed. ACK-ing.")
                        await redis.xack(STREAM_NAME, GROUP_NAME, msg_id)
                        continue
                    
                    try:
                        data = json.loads(raw_data)
                    except Exception as e:
                        logger.error(f"Failed to parse event JSON data: {e}")
                        await redis.xack(STREAM_NAME, GROUP_NAME, msg_id)
                        continue
                    
                    # Process with retries
                    success = False
                    retries = 3
                    for attempt in range(retries):
                        try:
                            await process_event(event_type, data)
                            success = True
                            break
                        except Exception as ex:
                            logger.warning(f"Error handling event {event_id} (Attempt {attempt+1}/{retries}): {ex}")
                            await asyncio.sleep(2 ** attempt)
                            
                    if success:
                        # Mark processed (idempotency key with 1 hour TTL)
                        await redis.setex(processed_key, 3600, "1")
                        await redis.xack(STREAM_NAME, GROUP_NAME, msg_id)
                        logger.info(f"Successfully processed event {event_id}")
                    else:
                        logger.error(f"Failed to process event {event_id} after {retries} retries. Routing to DLQ.")
                        # Route to DLQ
                        dlq_payload = {
                            "original_stream": STREAM_NAME,
                            "original_msg_id": msg_id,
                            "event_id": event_id,
                            "event_type": event_type,
                            "data": raw_data,
                            "error": traceback.format_exc()
                        }
                        await redis.xadd("dlq:stream", dlq_payload)
                        # ACK the message so it doesn't get stuck in PEL
                        await redis.xack(STREAM_NAME, GROUP_NAME, msg_id)
                        
        except Exception as e:
            logger.error(f"Error in consumer loop: {e}")
            await asyncio.sleep(5)
