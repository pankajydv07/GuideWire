# RiderShield — Phase 2: Automation & Protection

> **Timeline:** March 21 – April 4 (Weeks 3–4)  
> **Theme:** "Protect Your Worker"  
> **Goal:** Full zero-touch flow — disruption detected → claim → payout — working end-to-end.

---

## Deliverables

### 1. 2-Minute Demo Video
- Uploaded to a **publicly accessible link** (YouTube / Loom)
- Demo flow: Registration → Policy Management → Dynamic Premium → Simulated Disruption → Auto-Payout → Manual Claim Fallback → Admin Review

### 2. Executable Source Code Showcasing:

#### A. Registration Process
- End-to-end rider onboarding + KYC flow
- Phone verification, platform linking (Zepto / Blinkit / Swiggy)
- Zone & slot selection with risk profile preview
- **Ensure Phase 1 registration flow is fully functional and polished for demo**

#### B. Insurance Policy Management
- Weekly plan selection (Essential / Balanced / Max Protect)
- Policy lifecycle: activate, view, renew, cancel
- Active coverage status display (slots covered, hours remaining)
- Next-week premium forecast

#### C. Dynamic Premium Calculation
- LightGBM risk model trained on synthetic data
- Zone-level risk scoring with hyper-local risk factors
- Explainable premium breakdown per slot (e.g., "Thursday 7–9 PM in Zone 13 has 65% flood probability")
- ML adjusts weekly premium based on zone history (e.g., ₹2 less/week for water-logging-safe zones)
- Color-coded risk per slot (green → red)

#### D. Claims Management
- **Automated (zero-touch):** Trigger → income gap calc → basic fraud check → payout
- **Manual fallback:** Rider submits claim with geo-tagged photo, disruption type, description
- Geo-validation, weather/traffic corroboration, spam detection
- Admin review queue with one-click approve/reject

> **Note:** Advanced fraud detection, instant payout system (simulated), and intelligent dashboards are **Phase 3** deliverables and NOT part of Phase 2.

---

## Detailed Implementation Plan

---

### 1. Registration Process (Polish from Phase 1)

#### Tasks
- [ ] Ensure onboarding flow works end-to-end: name, phone, KYC, platform link, zone, slot preferences
- [ ] Phone verification flow (OTP mock or real)
- [ ] Platform linking UI (select Zepto / Blinkit / Swiggy Instamart)
- [ ] Zone selection with map or list view
- [ ] Working slot declaration with risk profile preview
- [ ] Polish mobile app UX for demo-readiness

---

### 2. Insurance Policy Management

#### Tasks
- [ ] **Plan selection UI** — display 3 tiers (Essential / Balanced / Max Protect) with coverage scope, guaranteed earnings %, and pricing
- [ ] **Policy activation** — one-click UPI mock payment → policy activates for the calendar week
- [ ] **Policy status view** — active coverage status, slots covered, hours remaining
- [ ] **Policy renewal** — prompt at week end, one-tap renew
- [ ] **Policy cancellation** — cancel active policy with confirmation
- [ ] **API endpoints:**
  - `POST /api/policies` — create/activate policy
  - `GET /api/policies/{rider_id}` — get active policy
  - `PUT /api/policies/{policy_id}/renew` — renew policy
  - `DELETE /api/policies/{policy_id}` — cancel policy

---

### 3. Dynamic Premium Calculation (ML-Powered)

#### Tasks
- [ ] **Generate synthetic training data**
  - Script to produce ~50,000 rider × zone × slot records
  - Features: historical earnings (4-week rolling), zone weather/AQI/congestion, events calendar, surge multiplier, store health, rider profile (tenure, rating, consistency)

- [ ] **Train LightGBM risk model**
  - Predict per-slot expected earnings and disruption probability
  - Outputs: earnings distribution, disruption probability, premium suggestion
  - Zone-specific, season-specific adaptive scoring

- [ ] **ML serving endpoint**
  - `POST /api/risk/premium` — rider ID + zone + planned slots → risk score + premium
  - Explainability: return reasons per slot (e.g., "monsoon forecast → 65% flood probability")

- [ ] **Integration with Policy Service**
  - Dynamic premium replaces Phase 1 rule-based pricing
  - Display risk color-coding per slot in plan selection UI
  - Premium adjusts based on hyper-local risk factors (per DEVTrails tip)

#### Files
- `backend/ml/data_generator.py` — synthetic data generation
- `backend/ml/premium_model.py` — LightGBM training + inference
- `backend/ml/model_artifacts/` — saved model files
- `backend/api/risk_routes.py` — premium API

---

### 4. Claims Management

#### 4A. Automated Triggers (3–5 triggers)

| # | Trigger | Threshold | Data Source |
|---|---------|-----------|-------------|
| 1 | Heavy Rain | > 40mm in 1hr | OpenWeatherMap |
| 2 | Traffic Congestion | > 80/100 sustained 60+ min | Google Maps / mock |
| 3 | Dark Store Closure | `store_status = CLOSED` | Platform Simulator |
| 4 | Platform Outage | `platform_status = DOWN` | Platform Simulator |
| 5 | Regulatory Event | `curfew_active = TRUE` | Mock data |

##### Tasks
- [ ] **Trigger Service** — evaluates zone × slot × rider status every 5 min
- [ ] **Implement trigger modules** (5 files under `backend/triggers/`)
- [ ] **3-condition gate:** trigger TRUE + rider online & in-zone + earnings below baseline
- [ ] **Community Signal Agent** — mass order collapse (>70% riders affected)
- [ ] Multiple simultaneous triggers = ONE disruption event (no double-payouts)

#### 4B. Zero-Touch Claims Automation

##### Tasks
- [ ] **Claims Service** — on DisruptionEvent, identify insured online riders in zone, create Claim records
- [ ] **Income Estimator** — expected vs actual earnings, `Payout = min(Income Loss, Weekly Coverage Limit)`
- [ ] **Basic fraud checks** — rule-based geo-consistency + peer comparison (enough for Phase 2 demo; full fraud detection is Phase 3)
- [ ] **Basic payout flow** — create Payout record + push notification with breakdown (full instant payout system is Phase 3)
- [ ] APIs: `GET /api/claims`, `GET /api/claims/{claim_id}`, `GET /api/admin/claims`

#### 4C. Manual Claim Submission (Fallback)

##### Tasks
- [ ] **Manual Claim API:**
  - `POST /api/claims/manual` — submit claim + geo-tagged photo
  - `GET /api/claims/manual/{claim_id}` — check status
- [ ] **Photo upload + EXIF extraction** — Pillow for EXIF GPS + timestamp, compute distance between EXIF GPS and app GPS
- [ ] **ManualClaim model** — rider_id, disruption_type, description, incident_coordinates, spam_score, review_status
- [ ] **GeoTaggedPhoto model** — file_reference, exif_gps, exif_timestamp, app_gps, distance_meters
- [ ] **Mobile UI** — "Request Manual Claim" button, disruption type selector, camera capture, status tracker
- [ ] Rate limit: 1 manual claim per policy week per rider

#### 4D. Geo-Validation Service

- [ ] Compare photo EXIF GPS → rider telemetry GPS
- [ ] Haversine distance calculation, flag if > 500m
- [ ] Store validation result on ManualClaim record

#### 4E. Weather & Traffic Corroboration

- [ ] Query OpenWeatherMap for photo GPS + timestamp (confirm rainfall > 7.6 mm/hr or wind > 40 km/h for weather claims)
- [ ] Query traffic API for photo GPS + timestamp (confirm congestion ≥ 70/100 for traffic claims)
- [ ] Check for existing DisruptionEvent at that zone/time (reduces spam score)

#### 4F. Spam Detection Pipeline

| Signal | Detection | Weight |
|--------|-----------|--------|
| Location mismatch | Photo GPS vs telemetry GPS > 500m | High |
| Time anomaly | EXIF timestamp vs incident time > 30 min | Medium |
| Weather mismatch | Claims weather but API shows benign | Medium |
| Traffic mismatch | Claims traffic but API shows low congestion | Medium |
| Known disruption | Matching DisruptionEvent exists | Negative (supports claim) |

- [ ] Composite spam score (0–100)
- [ ] Score ≥ 70 → auto-reject
- [ ] Score < 70 → route to admin queue (sorted ascending by spam score)

#### 4G. Admin Manual-Claim Review Queue

- [ ] `GET /api/admin/claims/manual` — pending claims, sorted by spam score (lowest first)
- [ ] `POST /api/admin/claims/{id}/approve` → triggers payout
- [ ] `POST /api/admin/claims/{id}/reject` → rider notified with reason
- [ ] Admin UI: claim card with photo preview, geo-validation result, corroboration summary, spam score badge, one-click approve/reject

---

## Database Schema Additions

| Table | Key Columns |
|-------|-------------|
| `disruption_events` | id, zone_id, slot_id, trigger_type, severity, created_at |
| `claims` | id, rider_id, disruption_event_id, expected_income, actual_income, income_gap, fraud_score, payout_amount, status |
| `manual_claims` | id, rider_id, disruption_type, description, incident_lat/lng, weather_data, traffic_data, spam_score, review_status |
| `geo_tagged_photos` | id, manual_claim_id, file_path, exif_lat/lng, exif_timestamp, app_lat/lng, distance_meters |
| `premium_calculations` | id, rider_id, zone_id, slot_data, risk_score, premium_amount, plan_tier |

---

## Tech Dependencies to Add

| Dependency | Purpose |
|-----------|---------|
| `lightgbm` | Premium risk model |
| `scikit-learn` | ML utilities |
| `Pillow` | EXIF GPS extraction from photos |
| `haversine` | GPS distance calculation |

---

## Implementation Order

```
Sprint 1 (Days 1–3):  Registration Polish + Policy Management + Dynamic Premium Engine
Sprint 2 (Days 4–7):  5 Triggers + Claims Automation + Income Estimator + Basic Fraud
Sprint 3 (Days 8–10): Manual Claims + Geo-Validation + Corroboration + Spam Detection
Sprint 4 (Days 11–14): Admin Review Queue + Integration Testing + Demo Video
```


## Exit Criterion

A **2-minute demo video** (publicly accessible) shows:
1. **Registration** — rider signs up, selects zone & slots
2. **Policy Management** — selects plan tier, pays premium, views active coverage
3. **Dynamic Premium** — ML-driven premium with explainable risk breakdown
4. **Auto-Claim** — simulated disruption triggers zero-touch payout
5. **Manual Claim** — rider submits fallback claim with geo-tagged photo
6. **Admin Review** — admin approves manual claim from review queue

---

*Phase 2 transforms RiderShield from a data-ingesting skeleton into a fully functional parametric insurance platform with ML-powered pricing, zero-touch claims, and manual fallback — "Protect Your Worker."*
