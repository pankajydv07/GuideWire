# Zylo — Work Left (Phase 3 Gap Analysis)

> Based on the README planned system vs. the current state of the repository as of April 14, 2026.

---

## Overall Progress

| Phase | Status | Completion |
|---|---|---|
| Phase 1 — Foundation | ✅ Complete | 100% |
| Phase 2 — Automation & Protection | ✅ Complete | 100% |
| Phase 3 — Scale & Optimise | 🟡 Partial | ~35–40% |

---

## Phase 1 & 2 — Fully Shipped ✅

Everything described in the README under Phase 1 and Phase 2 is implemented and confirmed working (all 24 smoke tests passing):

- Rider onboarding, OTP auth, JWT
- Policy lifecycle (buy / view / renew / cancel)
- LightGBM dynamic premium engine
- 9 automated parametric triggers (rain, heat, congestion, dark-store closure, platform outage, curfew, GPS shadowban, dark-store queue SLA, algorithmic shock) + Community Signal
- Three-Factor Validation Gate (trigger true + rider online + earnings dropped)
- Additional triggers G2–G7 from Plan.md: inventory stockout, road closure, RWA friction, civic event, GRAP vehicle ban, supply cascade
- Zero-touch claims automation
- Manual claim submission (geo-tagged photo + EXIF validation)
- Geo-validation service (GPS/EXIF comparison, weather/traffic corroboration, spam score, auto-reject ≥ 70)
- UPI payout simulation
- Admin dashboard (Next.js): manual claim review queue, auto-claims log, approve/reject, disruption heatmap
- Mobile app (Expo/React Native): registration, OTP, zone/slot, home dashboard, policy, claims, manual claim, profile
- Docker Compose (Postgres/TimescaleDB, Redis, backend, ML service, admin)

---

## Phase 3 — What Remains

### 1. Advanced Fraud Detection

| Component | Status | Notes |
|---|---|---|
| GPS Consistency check | ✅ Done | Rule-based in `claims_service/fraud.py` (30 pts) |
| Peer Comparison | ✅ Done | In `fraud.py` (25 pts) |
| Duplicate Claim detection | ✅ Done | In `fraud.py` (25 pts) |
| Baseline Validity check | ✅ Done | In `fraud.py` (20 pts) |
| Fraud score gating for auto-claims | ✅ Done | `AUTO_CLAIM_FRAUD_THRESHOLD` enforced in `claims_service/service.py` |
| **Isolation Forest ML model** | ❌ Missing | `fraud.py` is rule-based; no `sklearn.IsolationForest` trained model |
| **Behavioural autoencoder** | ❌ Missing | Not implemented anywhere |
| **Collusion graph / Neo4j (G10)** | ❌ Missing | No Neo4j in `docker-compose.yml`, no ring-detection code |
| **Counterfactual estimator** | ❌ Missing | Not implemented |
| **Geo-velocity impossibility checks** | ❌ Missing | Not implemented |

---

### 2. Parametric Trigger Gaps

| Gap | Status | Notes |
|---|---|---|
| G2–G7 (stockout, road closure, RWA, civic event, GRAP ban, supply cascade) | ✅ Done | All implemented and tested |
| **G1: AQI/GRAP Stage 3–4 trigger evaluator** | ❌ Missing | No `eval_aqi()` in `trigger_service/service.py` |
| **G11: Real AQI data from OWM Air Pollution API** | ❌ Missing | `weather_client.py` still uses `random.randint(50, 180)` mock; the real `/data/2.5/air_pollution` call is not made |

**What to build (spec already in `Plan.md` — TASK-A):**
- Call OWM Air Pollution API per zone, map OWM AQI 1–5 → Indian AQI proxy
- Add `eval_aqi()` evaluator: fires when `aqi > 300` → `trigger_type = "aqi_grap"`, `severity = "high"`
- Add `ScenarioKey.AQI_GRAP` to the platform simulator
- Register `"aqi_grap"` in the inject endpoint's allowed trigger types
- Add unit tests for threshold boundary

---

### 3. Instant Payout System

| Component | Status | Notes |
|---|---|---|
| UPI simulation (basic) | ✅ Done | `payout_service/service.py` simulates UPI wallet credit |
| **Razorpay test mode / Stripe sandbox** | ❌ Missing | No payment gateway SDK integration |
| **Webhook reconciliation** | ❌ Missing | No webhook listener or reconciliation logic |
| **Push notification on payout (FCM)** | ❌ Missing | No Firebase Cloud Messaging integration |

---

### 4. Rider Intelligent Dashboard

| Component | Status | Notes |
|---|---|---|
| Active policy & earnings shown | ✅ Done | Mobile home tab shows policy, payouts, zone risk |
| Claims history | ✅ Done | Claims tab in mobile app |
| Manual claim status tracker | ✅ Done | Manual claim tab exists |
| **Next-week risk forecast** | ❌ Missing | No ML forecasting endpoint; no UI component |
| **Forward-looking risk alerts** | ❌ Missing | Only current trigger status shown; no predictive alerts |

---

### 5. Admin Intelligent Dashboard

| Component | Status | Notes |
|---|---|---|
| Loss ratio | ✅ Done | Computed client-side in `admin/src/lib/api.ts` |
| Live disruption heatmap | ✅ Done | `/map` page in admin app |
| Manual claim review queue | ✅ Done | Full approve/reject with corroboration summary |
| Auto-claims feed | ✅ Done | Endpoint + UI in place |
| **Predictive analytics (next-week forecast)** | ❌ Missing | No ML predictions for upcoming disruption zones |
| **Fraud alert queue** | ❌ Missing | High-fraud-score claims go to general review queue; no dedicated fraud alert page |
| **Payout analytics page** | ❌ Missing | No breakdown/trend charts by trigger type, zone, or time |

---

### 6. Knowledge Graph v0

| Component | Status | Notes |
|---|---|---|
| **Neo4j zone/road/store/event graph** | ❌ Missing | Neo4j not in `docker-compose.yml`; no graph code |
| **Propagation logic** | ❌ Missing | — |

---

### 7. ML Model Improvements

| Component | Status | Notes |
|---|---|---|
| LightGBM v1 (risk scoring) | ✅ Done | Running in `backend/ml/` on port 8001 |
| **Temporal model (TCN/Transformer)** | ❌ Missing | Still LightGBM only; no sequence model |
| **Self-calibrating thresholds** | ❌ Missing | All trigger thresholds are static constants in `service.py` |

---

### 8. Final Submission Package

| Component | Status | Notes |
|---|---|---|
| Docker Compose (full stack) | ✅ Done | `docker-compose.yml` covers all services |
| **Demo video** | ❓ Unknown | Not in repository |
| **Pitch deck** | ❓ Unknown | Not in repository |

---

## Prioritised To-Do List

### High Priority (core Phase 3 gaps)

1. **G1 + G11 — AQI trigger** — Implement real OWM Air Pollution API call and `eval_aqi()` evaluator. Spec already written in `Plan.md → TASK-A`.
2. **Isolation Forest fraud detection** — Replace rule-based `fraud.py` with a trained `sklearn.IsolationForest`; add geo-velocity impossibility check.
3. **Collusion/ring detection (G10)** — Implement in-Postgres graph query or add Neo4j for coordinated fraud ring detection.
4. **Payment gateway** — Integrate Razorpay test mode or Stripe sandbox with webhook reconciliation.
5. **FCM push notifications** — Fire payout notification to rider's device on successful payout.

### Medium Priority (dashboard intelligence)

6. **Next-week risk forecast endpoint** — ML model to forecast likely disruption zones for next week; surface in both rider and admin dashboards.
7. **Admin fraud alert queue** — Dedicated page/endpoint for high-fraud-score flagged items separate from manual claim review.
8. **Payout analytics page** — Trend charts: payouts by trigger type, by zone, by week.

### Lower Priority (model quality)

9. **Self-calibrating thresholds** — Feedback loop to adjust trigger thresholds based on historical payout/false-positive data.
10. **TCN/Transformer temporal model** — Upgrade risk scoring from LightGBM to a sequence model for better spatio-temporal predictions.
