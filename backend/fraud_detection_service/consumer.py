import asyncio
import json
import logging
import traceback
from uuid import UUID
from datetime import datetime
from sqlalchemy import select
from shared.database import AsyncSessionLocal
from shared.redis_client import get_redis, publish_event
from fraud_detection_service.models import FraudReport
from fraud_detection_service.anomaly import check_telemetry_anomaly
from fraud_detection_service.collusion import check_collusion_graph
from trigger_service.models import PlatformSnapshot
from claims_service.models import Claim

logger = logging.getLogger("zylo.fraud_detection_service.consumer")
STREAM_NAME = "stream:claim"
GROUP_NAME = "fraud-group"
CONSUMER_NAME = "fraud-consumer-1"

async def evaluate_fraud(claim_id: str, rider_id: str, payout_amount: float, disruption_event_id: str, data: dict) -> tuple[int, list[str]]:
    """Execute all fraud intelligence rules and return fraud score + reasons list."""
    score = 0
    reasons = []

    # 1. Anomaly check (Isolation Forest)
    anomaly_score = await check_telemetry_anomaly({
        "orders_per_hour": data.get("orders_per_hour", 3.0),
        "earnings_current_slot": data.get("actual_earnings", 0.0),
        "earnings_rolling_baseline": data.get("expected_earnings", 540.0),
        "order_rate_drop_pct": 80.0,
        "avg_pickup_wait_sec": 300,
        "congestion_index": 85
    })
    if anomaly_score > 0.7:
        score += 25
        reasons.append("telemetry_anomaly_detected")

    # 2. Collusion Graph (Neo4j)
    collusion_points = await check_collusion_graph(rider_id, "mock@upi", "mock_device_fingerprint")
    if collusion_points > 0:
        score += collusion_points
        reasons.append("graph_collusion_detected")

    async with AsyncSessionLocal() as db:
        # 3. Duplicate claims check
        claim_uuid = UUID(claim_id)
        rider_uuid = UUID(rider_id)
        
        # Check database for duplicates
        duplicate_check = await db.execute(
            select(Claim).where(
                Claim.rider_id == rider_uuid,
                Claim.disruption_event_id == UUID(disruption_event_id) if disruption_event_id else None,
                Claim.id != claim_uuid
            )
        )
        if duplicate_check.scalars().all():
            score += 30
            reasons.append("duplicate_claim_attempt")

        # 4. Geo-velocity / Location consistency checks
        # Let's get the snapshots of the rider to check telemetry
        snapshot_check = await db.execute(
            select(PlatformSnapshot).where(PlatformSnapshot.rider_id == rider_uuid).order_by(PlatformSnapshot.time.desc()).limit(2)
        )
        snapshots = snapshot_check.scalars().all()
        if len(snapshots) >= 2:
            s1, s2 = snapshots[0], snapshots[1]
            # If distance is too far for time elapsed (impossible travel velocity)
            time_diff = abs((s1.time - s2.time).total_seconds())
            if time_diff > 0 and time_diff < 600: # 10 mins
                # Mock velocity check (coordinate differences)
                dist = abs(s1.congestion_index - s2.congestion_index) # placeholder index delta
                if dist > 50:
                    score += 20
                    reasons.append("impossible_geo_velocity")

    # Limit score to 100
    score = min(score, 100)
    return score, reasons

async def process_event(event_type: str, data: dict):
    """Handle incoming ClaimSubmitted events to run fraud verification."""
    if event_type == "ClaimSubmitted":
        claim_id = data.get("claim_id")
        rider_id = data.get("rider_id")
        payout_amount = data.get("payout_amount", 0.0)
        disruption_event_id = data.get("disruption_event_id")

        logger.info(f"Evaluating fraud for claim: {claim_id}")
        
        score, reasons = await evaluate_fraud(claim_id, rider_id, payout_amount, disruption_event_id, data)
        
        # Persist fraud report
        async with AsyncSessionLocal() as db:
            report = FraudReport(
                claim_id=UUID(claim_id),
                rider_id=UUID(rider_id),
                score=score,
                reasons=reasons
            )
            db.add(report)
            await db.commit()
            
        logger.info(f"Fraud report generated for claim {claim_id}: score={score}, reasons={reasons}")

        if score >= 70:
            # Publish FraudDetected event
            await publish_event(
                "stream:fraud",
                "FraudDetected",
                {
                    "claim_id": claim_id,
                    "rider_id": rider_id,
                    "fraud_score": score,
                    "reasons": reasons
                }
            )
        else:
            # Publish PayoutTriggered event
            await publish_event(
                "stream:payout",
                "PayoutTriggered",
                {
                    "claim_id": claim_id,
                    "rider_id": rider_id,
                    "amount": float(payout_amount)
                }
            )

async def start_consumer():
    """Start the Fraud Detection Service background consumer loop."""
    logger.info("Starting Fraud Detection Service background consumer...")
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
                    
                    processed_key = f"processed:fraud:{event_id}"
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
                            logger.warning(f"Error executing fraud evaluation {event_id}: {ex}")
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
            logger.error(f"Error in fraud consumer loop: {e}")
            await asyncio.sleep(5)
