import io
import asyncio
import httpx
import uuid
from datetime import datetime, timezone

from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Explicit local absolute imports since we will run this from backend folder
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from shared.database import AsyncSessionLocal
from policy_service.models import Policy
from main import app

BASE_URL = "http://test"

async def inject_mock_active_policy(rider_id: str) -> str:
    """Task 2 (Policy Service) is stubbed, so we manually inject a Policy directly into Postgres"""
    print("   [DB] Injecting Mock Active Policy directly to DB...")
    policy_id = str(uuid.uuid4())
    async with AsyncSessionLocal() as db:
        new_policy = Policy(
            id=uuid.UUID(policy_id),
            rider_id=uuid.UUID(rider_id),
            plan_tier="silver",
            week="week_13",
            premium=180,
            coverage_limit=1500,
            coverage_pct=50,
            coverage_used=0,
            expires_at=datetime.utcnow(),
            status="active"
        )
        db.add(new_policy)
        await db.commit()
    return policy_id

async def run_e2e_test():
    print("=========================================")
    print(" 🚀 STARTING FULL E2E INTEGRATION TEST 🚀 ")
    print("=========================================")
    
    # We must trigger lifespan events to init DB!
    from httpx import ASGITransport
    transport = ASGITransport(app=app)    
    async with httpx.AsyncClient(transport=transport, base_url=BASE_URL) as client:
        # 0. We need to manually initialize the DB since lifespan is bypassed sometimes by ASGITransport?
        # Actually ASGITransport does NOT trigger lifespan! Let's just call init_db manually.
        from shared.database import init_db, close_db
        from seeds.seed_zones import seed as seed_zones
        await init_db()
        await seed_zones()
        try:
            # 1. Health check
            print("\n1. Health Check & Zone Fetching...")
            r = await client.get(f"{BASE_URL}/health")
            assert r.status_code == 200, f"Health check failed: {r.text}"
            
            r = await client.get(f"{BASE_URL}/api/riders/zones")
            zones = r.json().get("zones", [])
            assert len(zones) > 0, "No zones available in DB"
            zone_id = zones[0]["id"]
            print(f"   ✅ Fetched Zone: {zones[0]['name']}")
    
            # 2. Rider Auth Flow
            print("\n2. Executing Rider Auth Flow (Task 1)...")
            phone = f"+9199{str(uuid.uuid4().int)[:8]}"
            
            await client.post(f"{BASE_URL}/api/riders/send-otp", json={"phone": phone})
            r = await client.post(f"{BASE_URL}/api/riders/verify-otp", json={"phone": phone, "otp": "123456"})
            temp_token = r.json()["temp_token"]
            
            rider_data = {"name": "E2E Test Rider", "platform": "zepto", "city": "bengaluru", "zone_id": zone_id, "slots": []}
            r = await client.post(f"{BASE_URL}/api/riders/register", json=rider_data, headers={"Authorization": f"Bearer {temp_token}"})
            assert r.status_code == 201, f"Registration failed: {r.text}"
            
            jwt_token = r.json()["jwt_token"]
            rider_id = r.json()["rider_id"]
            print(f"   ✅ Rider registered! ID: {rider_id}")
            
            # 3. Rider Onboarding
            print("\n3. Rider Onboarding & Premium Quote Fetch...")
            r = await client.post(f"{BASE_URL}/api/riders/onboard", json={"plan_tier": "balanced"}, headers={"Authorization": f"Bearer {jwt_token}"})
            assert r.status_code == 200, f"Onboarding quote fetch failed: {r.text}"
            print(f"   ✅ Received quote breakdown: {r.json().keys()}")
    
            # 4. Inject Policy mock
            print("\n4. Policy Generation (Mocking Task 2)...")
            policy_id = await inject_mock_active_policy(rider_id)
            print(f"   ✅ Policy injected: {policy_id}")
    
            # 5. Submit Manual Claim
            print("\n5. Submitting Manual Claim (Task 5)...")
            dummy_img = io.BytesIO(b"fake_image_bytes")
            fake_photo = ("evidence.jpg", dummy_img, "image/jpeg")
            claim_data = {"disruption_type": "weather", "description": "Flood test", "incident_time": datetime.now(timezone.utc).isoformat(), "latitude": str(12.9716), "longitude": str(77.5946)}
            r = await client.post(f"{BASE_URL}/api/claims/manual", data=claim_data, files={"photo": fake_photo}, headers={"Authorization": f"Bearer {jwt_token}"})
            assert r.status_code == 201, f"Failed to submit manual claim: {r.text}"
            manual_claim_id = r.json()["manual_claim_id"]
            print(f"   ✅ Submitted! Spam Score: {r.json()['spam_score']}. Manual Claim ID: {manual_claim_id}")
    
            # 6. Admin Login
            print("\n6. Admin Authentication (Task 5)...")
            r = await client.post(f"{BASE_URL}/api/admin/login", json={"username": "admin", "password": "admin123"})
            assert r.status_code == 200, "Admin login failed"
            admin_token = r.json()["access_token"]
            print("   ✅ Admin authenticated")
            
            # 7. Admin Queue Fetch
            print("\n7. Admin Reviewing Manual Claim Queue...")
            r = await client.get(f"{BASE_URL}/api/admin/claims/manual", headers={"Authorization": f"Bearer {admin_token}"})
            claims_queue = r.json().get("claims", [])
            target_mc = next((c for c in claims_queue if c["id"] == manual_claim_id), None)
            assert target_mc is not None, "Manual claim not found in admin queue!"
            base_claim_id = target_mc["claim_id"]
            print(f"   ✅ Claim found in queue. Base Claim ID: {base_claim_id}")
    
            # 8. Admin Approve Claim
            print("\n8. Admin Approving Claim & Initiating Payout...")
            r = await client.post(f"{BASE_URL}/api/admin/claims/{base_claim_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})
            assert r.status_code == 200, f"Approval failed: {r.text}"
            print("   ✅ Approval API succeeded!")
    
            # 9. Validate Final Payout Record
            print("\n9. Validating Rider Claim Status...")
            r = await client.get(f"{BASE_URL}/api/claims", headers={"Authorization": f"Bearer {jwt_token}"})
            final_claim = r.json().get("claims", [])[0]
            assert final_claim["status"] == "paid", f"Claim status is {final_claim['status']}"
            print(f"   ✅ SUCCESS! Final Status: {final_claim['status']}, Payout: ₹{final_claim['payout_amount']}")
        finally:
            await close_db()
        
    print("\n=========================================")
    print(" 🎉 ALL SYSTEMS FUNCTIONAL & INTEGRITY OK ")
    print("=========================================\n")


if __name__ == "__main__":
    asyncio.run(run_e2e_test())
