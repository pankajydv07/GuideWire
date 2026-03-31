"""
Dev 3: Background Scheduler — STUB

This runs the 5-minute evaluation cycle.
Start with:  python -m trigger_service.scheduler
Or imported and started in main.py lifespan.

TODO (Dev 3): Implement the full evaluation loop.
"""

import asyncio
import logging

logger = logging.getLogger("ridershield.scheduler")


async def evaluate_all_triggers():
    """
    Run every 5 minutes:
    1. Poll weather (OpenWeatherMap)
    2. Poll traffic (mock)
    3. Poll platform (simulator)
    4. Evaluate 5 triggers per zone
    5. Apply 3-factor validation gate
    6. Create DisruptionEvent if validated
    7. Notify Claims Service
    """
    logger.info("⏰ Evaluating triggers...")
    # TODO: Implement
    logger.info("✅ Trigger evaluation complete")


async def start_scheduler():
    """Start the background scheduler loop."""
    logger.info("🕐 Scheduler started — evaluating every 5 minutes")
    while True:
        try:
            await evaluate_all_triggers()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        await asyncio.sleep(300)  # 5 minutes


if __name__ == "__main__":
    asyncio.run(start_scheduler())
