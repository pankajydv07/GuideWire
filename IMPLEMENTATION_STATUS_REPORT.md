# GuideWire Zylo Implementation Status Report

Date: 2026-04-13

## 1. Scope Completed

Primary delivery completed for G2 to G7 from the implementation plan:

- G2: Inventory Stockout standalone trigger
- G3: Road Closure independent trigger
- G4: RWA Friction trigger
- G5: Civic Event trigger with abrupt short-window spike logic
- G6: GRAP Vehicle Ban trigger and data persistence support
- G7: Supply Cascade zone-level trigger

Additional stabilization and product-quality improvements were also completed:

- Reliability fix for onboarding timeout sensitivity
- Reliability fix for manual claim submission with images lacking EXIF metadata
- Affordability update for premium pricing (weekly plans reduced to rider-friendly ranges)
- GPS shadowban workflow adjusted to model real rider blocking behavior

## 2. Key Implementation Changes

### Trigger Engine (G2 to G7)

Updated trigger evaluation and event creation logic in:

- backend/trigger_service/service.py

What was added:

- New evaluator functions:
  - eval_stockout
  - eval_road_closure
  - eval_rwa_friction
  - eval_civic_event
  - eval_grap_ban
  - eval_supply_cascade
- New thresholds/constants for each trigger
- Rider-level evaluator registration in evaluate_all_zones
- Zone-level supply cascade event generation
- Severity and threshold helper mappings for all new trigger types

### Civic Event Detection Quality Upgrade

Civic event now uses abruptness, not only absolute congestion:

- Requires high congestion threshold and a short-window jump delta
- Uses 10-minute window and delta threshold logic

Files:

- backend/trigger_service/service.py
- Plan.md

### Simulator and Injection Wiring

Updated scenario simulation and trigger injection mappings:

- backend/data_collectors/platform_simulator.py
- backend/trigger_service/router.py
- backend/trigger_service/schemas.py
- backend/shared/schemas.py

What was added:

- Scenario keys and behaviors for G2 to G7
- Trigger inject API supports all new trigger types
- Shared trigger enum updated for consistency across services

### G6 Data Model and Persistence

Added GRAP ban persistence support:

- ORM field added: grap_vehicle_ban
- Scheduler persistence path updated
- Migration file created for grap_vehicle_ban column

Files:

- backend/trigger_service/models.py
- backend/trigger_service/scheduler.py
- backend/alembic/versions/20260413_add_grap_vehicle_ban_to_platform_snapshots.py

### GPS Shadowban Workflow Adjustment

Shadowban now reflects platform reality: rider blocked first, then confirmation.

What changed:

- Trigger-aware gate handling for gps_shadowban
- gps_shadowban no longer depends on rider being ONLINE
- Ban/confirmation metadata included in event payload
- Injected shadowban events now carry ban context fields
- Simulator GPS shadowban sets rider to OFFLINE immediately

Files:

- backend/trigger_service/service.py
- backend/trigger_service/router.py
- backend/data_collectors/platform_simulator.py

### Reliability and Affordability

Reliability fixes:

- Faster ML timeout/fallback path to prevent onboarding delays
- Defensive EXIF parsing to avoid manual claim 500-style crashes
- Smoke script schema mismatch fixed for manual claim response key

Affordability update:

- Premium base bands reduced
- Weekly caps introduced:
  - essential: 99
  - balanced: 129
  - max_protect: 169

Files:

- backend/premium_service/service.py
- backend/rider_service/router.py
- backend/manual_claims/photo_handler.py
- backend/full_stack_smoke_test.py

## 3. Verification Results

### Automated Tests

- Trigger evaluator suite: pass
  - 8 passed

### End-to-End Smoke Validation

- Full stack smoke test: pass
  - 24 passed
  - 0 failed
  - Results written to backend/smoke_test_results.json

### Runtime Health

- Backend service: up
- Postgres: connected
- Redis: connected
- Health endpoint status: healthy

## 4. Confirmed Working Behaviors

Confirmed working now:

- G2 to G7 trigger creation and event logging
- Trigger injection for all new trigger types
- Civic event abruptness detection behavior
- GRAP ban schema and data flow support
- GPS shadowban ban-first semantic handling
- Onboarding flow reliability (no previous timeout condition observed in latest smoke run)
- Manual claim submission flow reliability for typical test image payloads
- Affordable premium outputs (sample verified values below old 400 to 500 range)

## 5. Notes for Dashboard Testing

Dashboard and API testing can proceed.

If running backend locally with uvicorn while Docker backend is already up on port 8000, local uvicorn will fail to start due to port conflict. Use one backend runtime at a time:

- Option A: keep Docker backend running on port 8000
- Option B: stop Docker backend and run local uvicorn

## 6. Final Status

Implementation and stabilization work is complete for requested scope.

Current status: Ready for dashboard validation.
