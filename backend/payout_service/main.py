import logging
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from shared.config import settings
from shared.database import init_db, close_db
from shared.redis_client import close_redis
from payout_service.router import router as payout_router
from payout_service.consumer import start_consumer

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=getattr(logging, settings.LOG_LEVEL),
)
logger = logging.getLogger("zylo.payout_service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Payout Service...")
    await init_db()
    
    # Start the event consumer task in the background
    consumer_task = asyncio.create_task(start_consumer())
    
    yield
    
    logger.info("🛑 Shutting down Payout Service...")
    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        pass
    await close_db()
    await close_redis()

app = FastAPI(
    title="Zylo - Payout Service",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payout_router, prefix="/api/payouts", tags=["Payouts"])

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "payout_service"}
