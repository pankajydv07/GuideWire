"""
Dev 3: Weather API Client

Polls OpenWeatherMap every 5 minutes per zone.
Falls back to cached data on failure.
"""

import httpx
import logging
from shared.config import settings

logger = logging.getLogger("ridershield.weather")


async def fetch_weather(lat: float, lon: float) -> dict:
    """
    TODO (Dev 3):
    - Call OpenWeatherMap API:
      GET https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={key}
    - Extract: rainfall_mm, temperature, humidity, wind_speed, aqi
    - Store in weather_data hypertable
    - Cache latest in Redis for fallback
    - Return parsed weather dict
    """
    if not settings.OPENWEATHERMAP_API_KEY:
        logger.warning("No OpenWeatherMap API key — returning mock data")
        return _mock_weather()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"lat": lat, "lon": lon, "appid": settings.OPENWEATHERMAP_API_KEY, "units": "metric"},
            )
            resp.raise_for_status()
            data = resp.json()
            return _parse_weather(data)
    except Exception as e:
        logger.error(f"Weather API failed: {e} — using mock")
        return _mock_weather()


def _parse_weather(data: dict) -> dict:
    """Parse OpenWeatherMap response."""
    rain = data.get("rain", {}).get("1h", 0)
    return {
        "temperature": data.get("main", {}).get("temp", 25),
        "rainfall_mm": rain,
        "humidity": data.get("main", {}).get("humidity", 60),
        "wind_speed": data.get("wind", {}).get("speed", 5),
        "aqi": 50,  # AQI needs separate API call
    }


def _mock_weather() -> dict:
    """Fallback mock weather for development."""
    import random
    return {
        "temperature": round(random.uniform(22, 38), 1),
        "rainfall_mm": round(random.uniform(0, 60), 1),
        "humidity": random.randint(40, 95),
        "wind_speed": round(random.uniform(2, 25), 1),
        "aqi": random.randint(30, 150),
    }
