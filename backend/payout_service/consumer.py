import asyncio
import json
import logging
import traceback
from uuid import UUID
from shared.database import AsyncSessionLocal
from shared.redis_client import get_redis
from payout_service.service import process_upi_payout

logger = logging.getLogger("zylo.payout_service.consumer")
STREAM_NAME = "stream:payout"
GROUP_NAME = "payout-group"
CONSUMER_NAME = "payout-consumer-1"

async def process_event(event_type: str, data: dict):
    """Handle incoming PayoutTriggered events to execute actual payments."""
    if event_type == "PayoutTriggered":
        claim_id = UUID(data.get("claim_id"))
        rider_id = UUID(data.get("rider_id"))
        amount = int(data.get("amount", 0))
        
        logger.info(f"Processing PayoutTriggered for claim {claim_id}, amount: {amount}")
        
        async with AsyncSessionLocal() as db:
            await process_upi_payout(claim_id, rider_id, amount, db)

async def start_consumer():
    """Start the Payout Service background consumer loop."""
    logger.info("Starting Payout Service background consumer...")
    redis = await get_redis()
    
    try:
        await redis.xgroup_create(STREAM_NAME, GROUP_NAME, id="0", mkstream=True)
    except Exception:
        pass
        
    while True:
        try:
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
                    
                    processed_key = f"processed:payout:{event_id}"
                    is_processed = await redis.get(processed_key)
                    if is_processed:
                        await redis.xack(STREAM_NAME, GROUP_NAME, msg_id)
                        continue
                    
                    try:
                        data = json.loads(raw_data)
                    except Exception as e:
                        await redis.xack(STREAM_NAME, GROUP_NAME, msg_id)
                        continue
                    
                    success = False
                    retries = 3
                    for attempt in range(retries):
                        try:
                            await process_event(event_type, data)
                            success = True
                            break
                        except Exception as ex:
                            logger.warning(f"Error executing payout {event_id}: {ex}")
                            await asyncio.sleep(2 ** attempt)
                            
                    if success:
                        await redis.setex(processed_key, 3600, "1")
                        await redis.xack(STREAM_NAME, GROUP_NAME, msg_id)
                    else:
                        dlq_payload = {
                            "original_stream": STREAM_NAME,
                            "original_msg_id": msg_id,
                            "event_id": event_id,
                            "event_type": event_type,
                            "data": raw_data,
                            "error": traceback.format_exc()
                        }
                        await redis.xadd("dlq:stream", dlq_payload)
                        await redis.xack(STREAM_NAME, GROUP_NAME, msg_id)
                        
        except Exception as e:
            logger.error(f"Error in payout consumer loop: {e}")
            await asyncio.sleep(5)
