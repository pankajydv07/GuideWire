"""
Dev 1: Rider Service — Business Logic

Dev 1: Implement these functions. They are called from router.py.
"""


async def send_otp(phone: str) -> dict:
    """Store OTP in Redis, return confirmation."""
    # TODO: Redis SET otp:{phone} "123456" EX 300
    pass


async def verify_otp(phone: str, otp: str) -> dict:
    """Verify OTP from Redis, return temp token."""
    # TODO: Redis GET, compare, DEL, create_temp_token
    pass


async def register_rider(data: dict, db) -> dict:
    """Create rider + risk profile in DB, return JWT."""
    # TODO: INSERT rider, INSERT risk_profile, create_access_token
    pass


async def generate_baseline(rider_id, slots, db) -> dict:
    """Generate earnings baseline for a rider."""
    # TODO: Create rider_zone_baselines records
    pass
