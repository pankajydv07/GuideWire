import time
import asyncio
import json
import logging
import sys
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from shared.config import settings
from shared.redis_client import cache_get, cache_set, get_redis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zylo.benchmark_cache")

async def run_benchmark(rider_id: str, iterations: int):
    logger.info(f"Starting cache benchmark for rider: {rider_id} with {iterations} iterations")
    
    # 1. Warm up/Ensure key is clear
    redis = await get_redis()
    cache_key = f"policy:active:{rider_id}"
    await redis.delete(cache_key)
    
    # Reset counters
    await redis.delete("metrics:cache_hits")
    await redis.delete("metrics:cache_misses")
    
    test_policy = {
        "policy_id": "8c0490e6-a36d-47be-b7e1-2292f72bc9bb",
        "rider_id": rider_id,
        "plan_tier": "balanced",
        "coverage_week": "2026-W25",
        "premium": 75,
        "status": "active"
    }

    latencies = []

    # Iteration 1: Cache Miss
    t0 = time.perf_counter()
    # Simulate DB query (cache miss)
    val = await cache_get(cache_key)
    if not val:
        # Simulate DB lookup latency
        await asyncio.sleep(0.015) # 15ms mock DB lookup
        await cache_set(cache_key, test_policy, ttl=300)
    t1 = time.perf_counter()
    miss_latency = (t1 - t0) * 1000
    latencies.append(miss_latency)
    logger.info(f"Iteration 1 (Cache Miss) Latency: {miss_latency:.2f} ms")

    # Iteration 2 to N: Cache Hits
    for i in range(2, iterations + 1):
        t0 = time.perf_counter()
        val = await cache_get(cache_key)
        t1 = time.perf_counter()
        hit_latency = (t1 - t0) * 1000
        latencies.append(hit_latency)

    avg_hit_latency = sum(latencies[1:]) / len(latencies[1:])
    reduction = ((miss_latency - avg_hit_latency) / miss_latency) * 100
    
    hits = int(await redis.get("metrics:cache_hits") or 0)
    misses = int(await redis.get("metrics:cache_misses") or 0)
    total = hits + misses
    hit_ratio = (hits / total) * 100 if total > 0 else 0.0

    print("\n" + "="*40)
    print("        REDIS CACHE BENCHMARK RESULTS")
    print("="*40)
    print(f"Rider ID:                   {rider_id}")
    print(f"Total Iterations:           {iterations}")
    print(f"Cache Miss Latency (1st):   {miss_latency:.2f} ms")
    print(f"Avg Cache Hit Latency:      {avg_hit_latency:.2f} ms")
    print(f"API Latency Reduction:      {reduction:.2f}%")
    print(f"Cache Hits:                 {hits}")
    print(f"Cache Misses:               {misses}")
    print(f"Cache Hit Ratio:            {hit_ratio:.1f}%")
    print("="*40 + "\n")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run Redis Caching Benchmark")
    parser.add_argument("--rider-id", default="8c0490e6-a36d-47be-b7e1-2292f72bc9bb", help="Rider ID to query")
    parser.add_argument("--iterations", type=int, default=100, help="Number of query iterations")
    
    args = parser.parse_args()
    
    # Run loop
    asyncio.run(run_benchmark(args.rider_id, args.iterations))
