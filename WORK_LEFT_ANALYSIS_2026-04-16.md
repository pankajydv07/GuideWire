# Zylo — Work Left Analysis (Updated)

Date: 2026-04-16  
Baseline compared: provided `work-left.md` content (Phase 3 gap list) vs current `main` code in this repository.

---

## Executive Summary

The provided gap report is **partially outdated**.  
Key Phase 3 items previously marked missing are now implemented (notably **AQI trigger/data integration** and **Isolation Forest + collusion scoring integration**).

Estimated status now:

| Phase | Status | Completion (updated estimate) |
|---|---|---|
| Phase 1 — Foundation | ✅ Complete | 100% |
| Phase 2 — Automation & Protection | ✅ Complete | 100% |
| Phase 3 — Scale & Optimise | 🟡 Partial | ~55–65% |

---

## What Changed Since the Provided Work-Left Snapshot

### Now Implemented (previously listed as missing)

1. **G1 AQI/GRAP evaluator** is implemented
   - `backend/trigger_service/service.py` includes `AQI_GRAP_THRESHOLD = 300` and `eval_aqi()`.
2. **G11 OWM Air Pollution integration** is implemented
   - `backend/data_collectors/weather_client.py` calls `/data/2.5/air_pollution` and maps OWM AQI to proxy Indian AQI.
3. **AQI scenario wiring is implemented**
   - `backend/data_collectors/platform_simulator.py` has `ScenarioKey.AQI_GRAP`.
   - `backend/trigger_service/router.py` allows `"aqi_grap"` injection type.
4. **Isolation Forest-based anomaly signal is integrated**
   - Training artifact path and loader in `backend/ml/serve.py`.
   - Fraud scoring consumes anomaly score in `backend/claims_service/fraud.py`.
   - Training script exists: `backend/ml/training/train_isolation_forest.py`.
5. **Collusion spike detection exists (SQL-based)**
   - `backend/claims_service/fraud.py` has `detect_collusion()` and adds collusion points.

---

## Current “Work Left” (Verified)

## 1) Advanced Fraud Detection

| Component | Status | Notes |
|---|---|---|
| Rule-based fraud checks (GPS, peer, duplicate, baseline) | ✅ Done | `backend/claims_service/fraud.py` |
| Fraud gating threshold for auto-claims | ✅ Done | `AUTO_CLAIM_FRAUD_THRESHOLD` used in `backend/claims_service/service.py` |
| Isolation Forest anomaly scoring | ✅ Done (v1) | Integrated via `ml/serve.py -> predict_anomaly()` |
| Behavioural autoencoder | ❌ Missing | No autoencoder implementation found |
| Counterfactual estimator | ❌ Missing | No counterfactual model/service found |
| Geo-velocity impossibility checks | ❌ Missing | No speed/impossible travel checks found |
| Graph DB collusion (Neo4j) | ❌ Missing | No Neo4j service/code path in compose/backend |
| Collusion/ring detection (SQL heuristic) | 🟡 Partial | Exists, but not graph-based ring analytics |

## 2) Parametric Trigger Coverage

| Component | Status | Notes |
|---|---|---|
| G1 AQI/GRAP trigger | ✅ Done | `eval_aqi()` in trigger service |
| G2–G7 triggers | ✅ Done | Implemented and test-covered in `backend/tests/test_trigger_evaluators.py` |
| G11 real AQI data | ✅ Done | OWM air pollution endpoint integration present |

## 3) Instant Payout System

| Component | Status | Notes |
|---|---|---|
| UPI simulation payout | ✅ Done | `backend/payout_service/service.py` |
| Razorpay test integration | ❌ Missing | No Razorpay SDK/integration |
| Stripe sandbox integration | ❌ Missing | No Stripe integration |
| Webhook reconciliation | ❌ Missing | No payout webhook endpoints/reconciliation workers |
| FCM push on payout | ❌ Missing | No Firebase/FCM server integration |

## 4) Rider Intelligent Dashboard

| Component | Status | Notes |
|---|---|---|
| Active policy/earnings/claims/manual claim status | ✅ Done | Mobile app tabs implemented |
| Next-week risk forecast | ❌ Missing | No forecast API + UI surfaced |
| Predictive forward alerts | ❌ Missing | No predictive alerting flow found |

## 5) Admin Intelligent Dashboard

| Component | Status | Notes |
|---|---|---|
| Overview, manual review queue, auto-claims, map/triggers | ✅ Done | Next.js admin pages exist |
| Predictive analytics (next-week) | ❌ Missing | No predictive dashboard endpoint/page |
| Dedicated fraud alert queue | ❌ Missing | Fraud shown in claims list; no dedicated queue/page |
| Payout analytics page | ❌ Missing | No breakdown/trend analytics page found |

## 6) Knowledge Graph v0

| Component | Status | Notes |
|---|---|---|
| Neo4j graph (zone/road/store/event) | ❌ Missing | No Neo4j container in `docker-compose.yml` |
| Propagation logic | ❌ Missing | No graph propagation module found |

## 7) ML Model Improvements

| Component | Status | Notes |
|---|---|---|
| LightGBM/risk model baseline | ✅ Done | Existing ML service stack present |
| Temporal model (TCN/Transformer) | ❌ Missing | No temporal sequence model implementation |
| Self-calibrating trigger thresholds | ❌ Missing | Thresholds remain static constants in trigger service |

## 8) Final Submission Package

| Component | Status | Notes |
|---|---|---|
| Full stack compose | ✅ Done | Core services in `docker-compose.yml` |
| Demo video | ❓ Not in repo | No file/artifact found |
| Pitch deck | ❓ Not in repo | No file/artifact found |

---

## Prioritized Remaining Backlog

### High Priority
1. Add **real payment rail simulation depth**: Razorpay/Stripe sandbox + webhook reconciliation.
2. Add **FCM payout notifications** on successful payout.
3. Add **geo-velocity impossibility** and stronger anti-spoofing checks into fraud scoring.
4. Implement **graph-grade collusion/ring detection** (Postgres graph patterns or Neo4j).

### Medium Priority
5. Build **next-week risk forecast** endpoint and expose in rider/admin dashboards.
6. Add **dedicated admin fraud queue** (separate from generic claims list).
7. Add **payout analytics** dashboard page (trigger/zone/time trends).

### Lower Priority
8. Add **self-calibrating thresholds** from historical payout outcomes.
9. Upgrade to **temporal model (TCN/Transformer)** for sequence-aware risk prediction.
10. Produce and include **final demo package artifacts** (video + pitch deck).

---

## Validation Notes (current environment)

- Backend tests were attempted before documentation changes.
- `python -m pytest -q tests` currently shows **2 failures, 17 passed** in this environment, including:
  - missing async pytest plugin for one async auth test,
  - one fraud test expectation mismatch vs current fraud scoring behavior.
- Full smoke script also fails without running backend services (connection refused), which is environment/runtime related.

