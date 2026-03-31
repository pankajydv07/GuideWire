"""
Dev 3: Platform Simulator

Simulates Zepto/Blinkit/Swiggy store status, platform status, and rider snapshots.
This replaces real platform APIs for the hackathon.
"""

import random


class PlatformSimulator:
    """
    TODO (Dev 3): Make this more sophisticated —
    - Correlate store closures with weather
    - Simulate realistic order patterns by time of day
    - Add configurable disruption injection for demo
    """

    def get_store_status(self, zone_id: str) -> str:
        """Returns OPEN | CLOSED | MAINTENANCE (95% chance OPEN)."""
        return random.choices(
            ["OPEN", "CLOSED", "MAINTENANCE"],
            weights=[0.95, 0.03, 0.02],
        )[0]

    def get_platform_status(self) -> str:
        """Returns UP | DOWN | DEGRADED (98% chance UP)."""
        return random.choices(
            ["UP", "DOWN", "DEGRADED"],
            weights=[0.98, 0.01, 0.01],
        )[0]

    def get_rider_snapshot(self, rider_id: str, zone_id: str) -> dict:
        """Simulated rider earnings/orders for current slot."""
        return {
            "orders_per_hour": random.randint(2, 15),
            "earnings_current_slot": random.randint(100, 500),
            "rider_status": random.choice(["ONLINE", "ONLINE", "ONLINE", "OFFLINE"]),
        }

    def get_traffic_data(self, zone_id: str) -> dict:
        """Mocked traffic congestion data."""
        return {
            "congestion_index": random.randint(20, 95),
            "duration_min": random.randint(10, 120),
            "source": "mock",
        }

    def is_curfew_active(self, zone_id: str) -> bool:
        """Always False unless demo-injected."""
        return False


# Singleton
platform_sim = PlatformSimulator()
