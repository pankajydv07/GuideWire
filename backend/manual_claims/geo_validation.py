"""
Dev 5: Geo-Validation + Spam Detection utilities

These are imported by manual_claims/router.py during claim processing.
"""

from math import radians, sin, cos, sqrt, atan2


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance in meters between two GPS coordinates.
    Used to compare photo EXIF GPS vs rider's declared position.
    
    Returns: distance in meters
    """
    R = 6371000  # Earth radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lon2 - lon1)

    a = sin(delta_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


def calculate_spam_score(
    gps_distance_m: float,
    time_delta_min: float,
    disruption_type: str,
    weather_rainfall_mm: float = 0,
    weather_wind_kmh: float = 0,
    traffic_congestion_index: int = 0,
) -> int:
    """
    Calculate composite spam score (0-100).
    
    Weights:
    - Location mismatch (>500m): 35%
    - Time anomaly (>30 min): 25%
    - Weather mismatch: 20%
    - Traffic mismatch: 20%
    
    Auto-reject if score >= 70.
    """
    score = 0

    # Location mismatch (35% weight)
    if gps_distance_m > 500:
        score += 35

    # Time anomaly (25% weight)
    if time_delta_min > 30:
        score += 25

    # Weather mismatch (20% weight)
    if disruption_type == "weather":
        if weather_rainfall_mm < 7.6 and weather_wind_kmh < 40:
            score += 20

    # Traffic mismatch (20% weight)
    if disruption_type == "traffic":
        if traffic_congestion_index < 70:
            score += 20

    return min(score, 100)


def extract_exif_gps(photo_path: str) -> dict | None:
    """
    Extract GPS coordinates from photo EXIF data.
    
    TODO (Dev 5):
    - Use exifread or Pillow to read EXIF
    - Extract GPSLatitude, GPSLongitude, DateTimeOriginal
    - Convert DMS to decimal degrees
    - Return {"lat": float, "lon": float, "timestamp": datetime} or None
    """
    try:
        import exifread
        with open(photo_path, "rb") as f:
            tags = exifread.process_file(f)
        
        # TODO: Parse GPS tags and convert to decimal
        return None
    except Exception:
        return None
