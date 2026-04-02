"""
Static zone registry — simulates the `zones` table owned by Dev 1.
Each zone has an id, name, city, lat/lon, and a list of rider_ids.
"""

import uuid

# Stable zone UUIDs (deterministic for reproducibility)
ZONES = [
    {
        "id": "a1b2c3d4-0001-0001-0001-000000000001",
        "name": "gachibowli",
        "city": "Hyderabad",
        "lat": 17.4401,
        "lon": 78.3489,
        "rider_ids": [
            "r1000001-0001-0001-0001-000000000001",
            "r1000001-0001-0001-0001-000000000002",
            "r1000001-0001-0001-0001-000000000003",
        ],
    },
    {
        "id": "a1b2c3d4-0002-0002-0002-000000000002",
        "name": "koramangala",
        "city": "Bengaluru",
        "lat": 12.9279,
        "lon": 77.6271,
        "rider_ids": [
            "r2000002-0002-0002-0002-000000000001",
            "r2000002-0002-0002-0002-000000000002",
        ],
    },
    {
        "id": "a1b2c3d4-0003-0003-0003-000000000003",
        "name": "andheri_west",
        "city": "Mumbai",
        "lat": 19.1288,
        "lon": 72.8278,
        "rider_ids": [
            "r3000003-0003-0003-0003-000000000001",
            "r3000003-0003-0003-0003-000000000002",
            "r3000003-0003-0003-0003-000000000003",
        ],
    },
    {
        "id": "a1b2c3d4-0004-0004-0004-000000000004",
        "name": "rajouri_garden",
        "city": "Delhi",
        "lat": 28.6442,
        "lon": 77.1194,
        "rider_ids": [
            "r4000004-0004-0004-0004-000000000001",
        ],
    },
]

ZONE_BY_ID = {z["id"]: z for z in ZONES}
ZONE_BY_NAME = {z["name"]: z for z in ZONES}


def get_all_zones():
    return ZONES


def get_zone(zone_id: str):
    return ZONE_BY_ID.get(zone_id)


def get_zone_by_name(name: str):
    return ZONE_BY_NAME.get(name.lower())
