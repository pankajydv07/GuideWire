import asyncio
import json
import logging
import traceback
from uuid import UUID
from datetime import datetime
from sqlalchemy import select
from shared.database import AsyncSessionLocal
from shared.redis_client import get_redis, publish_event
from risk_scoring_service.models import RiskScore

logger = logging.getLogger("zylo.risk_scoring_service.consumer")
STREAM_NAME = "stream:fraud"
GROUP_NAME = "risk-group"
CONSUMER_NAME = "risk-consumer-1"

async def process_event(event_type: str, data: dict):
    """Handle incoming FraudDetected events to update and cache rider risk scores."""
    if event_type == "FraudDetected":
        rider_id = data.get("rider_id")
        fraud_score = int(data.get("fraud_score", 0))
        
        logger.info(f"Processing FraudDetected for rider {rider_id}, fraud score: {fraud_score}")
        
        async with AsyncSessionLocal() as db:
            rider_uuid = UUID(rider_id)
            result = await db.execute(
                select(RiskScore).where(RiskScore.rider_id == rider_uuid)
            )
            risk = result.scalar_one_or_none()
            old_score = 10
            
            if not risk:
                risk = RiskScore(rider_id=rider_uuid, score=10)
                db.add(risk)
                await db.flush()
                
            old_score = risk.score
            # Risk score increases based on fraud score
            risk.score = min(100, risk.score + int(fraud_score * 0.5))
            risk.last_calculated = datetime.utcnow()
            
            db.add(risk)
            await db.commit()
            
            logger.info(f"Updated rider {rider_id} risk score from {old_score} to {risk.score}")

            # Update/Cache in Redis (TTL: 180 seconds / 3 minutes)
            redis = await get_redis()
            cached_data = {
                "rider_id": rider_id,
                "score": risk.score,
                "last_calculated": risk.last_calculated.isoformat()
            }
            await redis.setex(f"risk:score:{rider_id}", 180, json.dumps(cached_data))
            
            # Publish RiskScoreUpdated event
            await publish_event(
                "stream:risk",
                "RiskScoreUpdated",
                {
                    "rider_id": rider_id,
                    "old_score": old_score,
                    "new_score": risk.score,
                    "trigger_reason": "fraud_detected_on_claim"
                }
            )

async def start_consumer():
    """Start the Risk Scoring Service background consumer loop."""
    logger.info("Starting Risk Scoring Service background consumer...")
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
                    
                    processed_key = f"processed:risk:{event_id}"
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
                            logger.warning(f"Error executing risk recalculation {event_id}: {ex}")
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
            logger.error(f"Error in risk consumer loop: {e}")
            await asyncio.sleep(5)
