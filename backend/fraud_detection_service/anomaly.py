import httpx
import logging

logger = logging.getLogger("zylo.fraud.anomaly")
ML_SERVICE_URL = "http://ml:8001/predict/anomaly"

async def check_telemetry_anomaly(features: dict) -> float:
    """Send telemetry details to ML microservice to get an anomaly score."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                ML_SERVICE_URL,
                json={
                    "orders_per_hour": float(features.get("orders_per_hour", 0.0)),
                    "earnings_current_slot": float(features.get("earnings_current_slot", 0.0)),
                    "earnings_rolling_baseline": float(features.get("earnings_rolling_baseline", 0.0)),
                    "order_rate_drop_pct": float(features.get("order_rate_drop_pct", 0.0)),
                    "avg_pickup_wait_sec": float(features.get("avg_pickup_wait_sec", 0.0)),
                    "congestion_index": float(features.get("congestion_index", 0.0))
                },
                timeout=2.0
            )
            if response.status_code == 200:
                return response.json().get("anomaly_score", 0.0)
            else:
                logger.warning(f"ML service returned status {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to query anomaly model from ML service: {e}")
    return 0.0
