"""
Redis client — shared across services.

Usage:
    from shared.redis_client import get_redis

    redis = await get_redis()
    await redis.setex(f"otp:{phone}", 300, "123456")
    otp = await redis.get(f"otp:{phone}")
"""

import redis.asyncio as aioredis
from shared.config import settings

_redis_client: aioredis.Redis | None = None


class MockRedis:
    def __init__(self):
        self.data = {}
        self.streams = {}
        self.groups = {}
    async def set(self, key, value, ex=None):
        self.data[key] = value
    async def setex(self, key, time, value):
        self.data[key] = value
    async def get(self, key):
        return self.data.get(key)
    async def delete(self, key):
        self.data.pop(key, None)
    async def ping(self):
        return True
    async def close(self):
        pass
    async def xadd(self, name, fields, id='*', maxlen=None, approximate=True):
        if name not in self.streams:
            self.streams[name] = []
        msg_id = f"{len(self.streams[name]) + 1}-0"
        self.streams[name].append((msg_id, fields))
        return msg_id
    async def xgroup_create(self, name, groupname, id='$', mkstream=False):
        if name not in self.groups:
            self.groups[name] = set()
        self.groups[name].add(groupname)
    async def xreadgroup(self, groupname, consumername, streams, count=None, block=None, noack=False):
        res = []
        for stream_name, last_id in streams.items():
            if stream_name in self.streams:
                res.append([stream_name, self.streams[stream_name]])
        return res
    async def xack(self, name, groupname, *ids):
        return len(ids)

async def get_redis():
    """Get or create async Redis client."""
    global _redis_client
    if _redis_client is None:
        if "sqlite" in settings.DATABASE_URL:
            _redis_client = MockRedis()
        else:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
    return _redis_client


async def close_redis():
    """Close Redis connection on app shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None

import json
import uuid
from datetime import datetime, timezone

async def publish_event(stream_name: str, event_type: str, data: dict):
    """Publish an event to a Redis Stream."""
    redis = await get_redis()
    payload = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": json.dumps(data)
    }
    # xadd takes name and key-value dict mapping
    return await redis.xadd(stream_name, payload)

async def cache_get(key: str) -> dict | None:
    """Retrieve serialized JSON data from cache."""
    try:
        redis = await get_redis()
        val = await redis.get(key)
        if val:
            try:
                await redis.incr("metrics:cache_hits")
            except Exception:
                pass
            return json.loads(val)
        else:
            try:
                await redis.incr("metrics:cache_misses")
            except Exception:
                pass
    except Exception as e:
        import logging
        logging.getLogger("zylo.cache").error(f"Cache get error for {key}: {e}")
    return None

async def cache_set(key: str, data: dict, ttl: int = 300):
    """Store serialized JSON data in cache with a TTL."""
    try:
        redis = await get_redis()
        await redis.setex(key, ttl, json.dumps(data))
    except Exception as e:
        import logging
        logging.getLogger("zylo.cache").error(f"Cache set error for {key}: {e}")

async def cache_delete(key: str):
    """Delete a key from cache."""
    try:
        redis = await get_redis()
        await redis.delete(key)
    except Exception as e:
        import logging
        logging.getLogger("zylo.cache").error(f"Cache delete error for {key}: {e}")

