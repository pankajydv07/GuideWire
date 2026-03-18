Based on all the research and source documents already read, here is your fully synthesized, concise, hackathon-ready README:

***

```markdown
# RiderShield — Parametric Income Protection for Q-Commerce Riders

> **Automatic income protection for delivery riders.**  
> When rain, gridlock, GPS glitches, or platform failures kill your earnings —  
> RiderShield detects it and pays you. No claims. No paperwork. No waiting.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)  
2. [Persona & Scenarios](#2-persona--scenarios)  
3. [Application Workflow](#3-application-workflow)  
4. [Weekly Premium Model](#4-weekly-premium-model)  
5. [Parametric Triggers](#5-parametric-triggers)  
6. [Platform Choice — Mobile-First PWA](#6-platform-choice--mobile-first-pwa)  
7. [AI/ML Integration](#7-aiml-integration)  
8. [System Architecture](#8-system-architecture)  
9. [Tech Stack](#9-tech-stack)  
10. [Development Plan](#10-development-plan)  
11. [Competitive Differentiation](#11-competitive-differentiation)  
12. [Business Viability](#12-business-viability)  
13. [Getting Started](#13-getting-started)

---

## 1. Problem Statement

India's quick-commerce sector (~$11.5B, growing rapidly) runs on an invisible workforce of
delivery partners operating for Blinkit, Zepto, and Swiggy Instamart. These riders:

- Earn **₹15,000–₹25,000/month**, entirely per-delivery — no fixed salary, no employer safety net.
- Lose **20–30% of monthly income** to external disruptions completely outside their control.
- Operate in hyper-local 2–5 km zones around dark stores, making them acutely sensitive to
  micro-level disruptions — a flooded underpass, a GPS glitch, a store outage.
- Function on **weekly cash flow cycles**, servicing debt on phones and bikes bought to do
  the job.

Traditional indemnity insurance structurally fails here:

| Problem | Why Traditional Insurance Fails |
|---|---|
| No fixed salary | Can't underwrite a variable daily income |
| Manual claims | Riders can't wait 30 days; they need money this week |
| Asset focus | Insurance covers vehicle damage, not lost earnings |
| Proof burden | "It rained and I lost orders" is not provable to a claims adjuster |

**Parametric insurance solves all of this.** Instead of proving a loss, the system uses
measurable, objective data signals (rainfall mm, congestion index, store status) as automatic
triggers. If the data says it happened, you get paid. Period.

**Coverage scope (DEVTrails mandate strictly followed):** Income loss from external disruptions
only. Health, life, vehicle damage, and accidents are explicitly excluded.

---

## 2. Persona & Scenarios

### Primary Persona — Arjun, 24, Q-Commerce Rider, Bengaluru

- Works for Zepto from 2 dark stores in Indiranagar/Koramangala.
- Typical pattern: evening peaks (6–11 PM), weekend mornings (8–11 AM).
- Earns ~₹18,000/month. Weekly payout from Zepto every Monday.
- Operates within a 3-km radius. Income collapses if his zone, his dark store, or the
  platform has issues.
- Pain points: monsoon flooding, GPS drift in high-rises, dark store queues, sudden
  political rallies blocking his route.

---

### Scenario 1: Heavy Rain + Flooding — Rohit, Hyderabad

**Context:** Rohit averages 12 orders/hr (₹15/order). Tuesday 3–7 PM, heavy rain hits Gachibowli.

| Step | Action |
|---|---|
| 3:05 PM | OpenWeatherMap reports 52mm rainfall in Gachibowli (threshold: 40mm) |
| 3:06 PM | Trigger Service fires a disruption event for Zone: Gachibowli |
| 3:07 PM | Claims Service identifies Rohit as an insured, online rider in this zone |
| 3:08 PM | Income Estimator: Expected ₹720 (12 × 4hrs × ₹15), Actual ₹180 (3 orders/hr) |
| 3:09 PM | Fraud Service: GPS confirms Rohit is in zone ✓, peer earnings confirm disruption ✓ |
| 3:10 PM | **Payout ₹540 sent to Rohit's UPI wallet** |

Rohit gets a push notification with a full breakdown. He did nothing except stay online.

---

### Scenario 2: GPS Multipath Shadowban — Ankush, Noida

**Context:** Ankush is delivering in DLF Cyber Hub, Gurugram — a dense urban canyon of
high-rises that causes GPS multipath interference. His location drifts on the Zepto map;
the platform algorithm interprets this as route deviation and shadowbans him for 2 hours.
He loses ₹400 in that shift. Traditional insurance: useless. RiderShield:

| Step | Action |
|---|---|
| System detects | Ankush's order allocation drops to 0 while peers in the same zone earn normally |
| Community Signal | Only Ankush affected → individual signal, not zone-wide |
| Platform API | "Rider active = TRUE, orders dispatched = 0 for 120 min" → trigger fires |
| Fraud check | GPS signal verified as unstable (multipath flag from telemetry), not spoofing |
| **Payout** | ₹380 credited (income gap for 2 disrupted slots) |

---

### Scenario 3: Community Signal — 45 Riders, Andheri West, Mumbai

**Context:** Sunday evening. A water main breaks, flooding 3 streets near a cluster of dark
stores. No weather API picks it up. No traffic event is logged. But:

- 82% of 45 riders in the zone report an order collapse in the same 30-minute slot.
- Community Signal Agent fires: threshold crossed (>70% of zone riders affected).
- All 45 insured riders receive individual claim calculations based on their own baselines.
- **Payouts distributed in batch — no API triggered it. The rider community was the sensor.**

---

### Scenario 4: Dark Store Outage — Priya, Delhi

**Context:** Priya's primary dark store in Rajouri Garden shuts unexpectedly (equipment
failure) from 10 AM–2 PM. No orders dispatch. 4 hours, zero income.

- Platform API: `store_status = CLOSED` → trigger fires automatically.
- Income gap: Expected ₹300 (10 orders/hr × ₹7.5/order × 4hrs), Actual ₹0.
- GPS: Priya is near the store, confirms she was working. Fraud check passes.
- **Payout: ₹300.**

---

### Scenario 5: Fraud Attempt — No Payout

**Context:** A rider stays home on a sunny, normal-traffic day and hopes for a payout.

- No parametric triggers fire for their zone.
- GPS shows they were not in the delivery zone.
- Peer riders in the same zone earned normally.
- **Result: No disruption event, no claim, no payout.** Parametric triggers cannot be
  gamed without an actual external event in the zone.

---

## 3. Application Workflow

```

[Rider Onboards] → [Selects Weekly Cover] → [Premium Paid via UPI]
↓
[Policy Activated for Calendar Week]
↓
[Background: Data Collector polls APIs every 5 min]
↓ ↓ ↓ ↓
[Weather] [Traffic] [Platform/Store] [Payment Rails]
↓
[Trigger Service evaluates zone × slot × rider status]
↓
[Disruption Event Created]
↓
[Claims Service: identify insured online riders in zone]
↓
[Income Estimator: expected vs actual earnings]
↓
[Fraud Service: GPS, peer comparison, behavioural checks]
↓
[Payout Service: instant UPI credit]
↓
[Push Notification to Rider + Dashboard Update]

```

### Rider-Facing Steps

1. **Sign Up** — Phone + KYC, link delivery platform(s), select city and zones.
2. **Weekly Setup** — Declare typical working slots. System shows risk profile per slot
   (color-coded: green → red) and suggests 3 plan tiers.
3. **Buy Cover** — One weekly premium payment via UPI/wallet. Coverage activates immediately.
4. **Work Normally** — App monitors in the background. No rider action needed.
5. **Get Paid** — Push notification + breakdown + UPI credit if a trigger fires.

### Rider Dashboard

- Active coverage status (slots covered, hours remaining).
- Disruption alerts in real time.
- Claim history and payout tracking with cause breakdown (weather / traffic / platform / regulatory).
- Next-week premium forecast and risk insights.

### Admin/Insurer Dashboard

- Live disruption heatmap (zone × time).
- Loss ratio: payouts vs. premiums collected.
- Fraud alert queue and review panel.
- Next-week risk projections per micro-zone.

---

## 4. Weekly Premium Model

### Why Weekly?

- Riders are paid weekly by platforms. A weekly insurance cycle is a natural fit — no
  mismatch in cash flows.
- Weekly pricing allows dynamic adjustment per season, zone risk, and forecast.
- Riders who take a week off simply don't buy cover. No wasted money.

### Micro-Slot Logic (Internal)

The product appears simple to the rider (one weekly plan, one price) but internally prices at
**30–60 minute micro-slot granularity**:

- Working time is broken into slots (e.g., 7:00–7:30 AM, 7:30–8:00 AM, …).
- For each slot we estimate:
  - **Expected earnings** under normal conditions for that rider, zone, and time.
  - **Disruption probability** — chance that external conditions push earnings below the
    guaranteed floor.
- Aggregate risk across all planned slots → weekly pure premium + admin load.

**Why this matters:** An evening-only rider in a monsoon-prone zone pays a fair price. A
morning rider in a low-disruption suburb pays less. Coverage is personalised and explainable.

### Three Plan Tiers (Rider-Facing)

| Plan | Coverage Scope | Guaranteed Earnings | Best For |
|---|---|---|---|
| **Essential** | High-risk slots only (e.g., monsoon evenings) | 70% of baseline | Budget-conscious riders |
| **Balanced** | All usual working hours | 80% of baseline | Standard weekly workers |
| **Max Protect** | Usual + optional late/early slots | 90% of baseline | Heavy-duty riders, peak season |

### Illustrative Pricing

| Zone Risk | Example | Weekly Premium |
|---|---|---|
| Low (score 0–25) | Dry-season Pune suburb | ₹20–₹35 |
| Medium (score 26–50) | Normal Hyderabad zone | ₹50–₹80 |
| High (score 51–75) | Mumbai pre-monsoon zone | ₹80–₹120 |
| Very High (76–100) | Coastal zone during cyclone season | ₹120–₹150 |

Premiums remain within a micro-insurance bracket to maximise adoption among riders
earning ₹15,000–₹25,000/month.

### Payout Calculation

```

Expected Income = avg_orders_per_hr × disrupted_hrs × ₹_per_order
Actual Income   = actual_orders × ₹_per_order
Income Loss     = Expected − Actual
Payout          = min(Income Loss, Weekly Coverage Limit)

```

Baselines are set per rider using 4-week rolling historical averages, adjusted for zone,
day-of-week, and slot time. New riders use zone-level medians until personal history builds.

---

## 5. Parametric Triggers

A parametric trigger is a measurable, objective condition that fires automatically — no
human judgment, no claim form.

### 5.1 Baseline Triggers

| Category | Trigger | Threshold | Data Source |
|---|---|---|---|
| **Weather** | Rainfall intensity | > 40mm in 1hr in rider's zone | OpenWeatherMap / IMD |
| **Weather** | Heat index | Wet-bulb temp > 32°C or air temp > 42°C | OpenWeatherMap |
| **Air Quality** | AQI breach | > 300 (hazardous) or GRAP Stage 3/4 active | OpenAQ / CPCB |
| **Traffic** | Congestion index | > 80/100 sustained for 60+ min | Google Maps / TomTom |
| **Traffic** | Road closure | `road_blocked = TRUE` near dark store | Traffic APIs |
| **Store** | Dark store closed | `store_status = CLOSED` | Platform API (simulated) |
| **Store** | Inventory stockout | `stock_level = CRITICAL` | Platform API (simulated) |
| **Platform** | App / API outage | `platform_status = DOWN` in zone | Platform status API |
| **Payments** | UPI downtime | `upi_status = DEGRADED` | NPCI status / Razorpay |
| **Regulatory** | Curfew / ban | `curfew_active = TRUE` | News feed / govt portal |
| **Community Signal** | Mass order collapse | > 70% riders in zone see simultaneous drop | Internal rider data |

### 5.2 Out-of-the-Box Triggers (Our Differentiators)

These cover uniquely Indian urban frictions no competitor insures:

| Trigger | Mechanism |
|---|---|
| **Urban Canyon GPS Multipath** | High-rises cause GPS drift → platform shadowbans rider. Detected via order-allocation anomaly + telemetry instability flags. |
| **Unpaid Dark Store Wait Time** | Chronic pickup queues due to inventory or billing issues. Triggered when dispatch delay > 5 min SLA across multiple riders at same store. |
| **Gated Community / RWA Frictions** | Elevator bans, MyGate delays, late-night entry curfews. Detected via delivery time anomaly + geo-fence status. |
| **VIP Convoy / Spontaneous Civic Events** | Sudden arterial blockades trapping entire local fleets. Detected via speed-anomaly and traffic graph propagation. |
| **Algorithmic Visibility Shock** | Platform A/B tests or throttling suddenly reduce order allocation. Detected via peer-comparison ratio (rider orders vs zone orders). |
| **GRAP-mandated vehicle bans** | Government mandates barring specific vehicle classes in high-AQI conditions. Linked to official GRAP stage APIs. |
| **Warehouse / Supply Chain Cascade** | Upstream warehouse failure causing simultaneous multi-store stockouts. Detected via synchronized `no-slots` across dependent stores. |

### 5.3 Trigger Decision Logic

A claim is auto-initiated only when **all three conditions are met**:

1. A configured trigger condition is TRUE for the rider's zone and time slot.
2. The rider's GPS / platform status confirms they were **online and in-zone**.
3. Actual earnings fall **below the model-predicted baseline band** for those conditions.

Multiple simultaneous triggers (rain + traffic + store outage) count as **one disruption event**
— no double-payouts per slot.

---

## 6. Platform Choice — Mobile-First PWA

**We chose a Mobile-First Progressive Web App (PWA)** for Phase 1.

| Factor | Decision |
|---|---|
| **Rider behaviour** | Riders manage their entire livelihood via smartphone, between trips, at dark-store queues. Desktop is irrelevant. |
| **Avoiding app overload** | Riders already run delivery apps, maps, and payment apps. A heavy native install adds friction. A PWA installs from browser and sits on the home screen. |
| **Cross-platform coverage** | Same React Native / Next.js codebase works on Android and iOS without separate builds. |
| **Iteration speed** | PWA enables push-to-prod without app store review cycles — critical for a hackathon. |
| **Backend-heavy product** | Most intelligence (triggers, ML, payouts) lives server-side. Native sensors are not critical for Phase 1. |

**Future (Phase 3+):** A native app layer or a **Guidewire Jutro Digital Platform**
integration for deeper sensor access, background telemetry, and enterprise-grade insurer UI.

---

## 7. AI/ML Integration

Our AI strategy is **honest and phased** — practical models now, advanced architectures on
a clear roadmap.

### 7.1 v1 Models (Hackathon Deliverable)

#### A. Spatio-Temporal Risk Model (Premium Calculation)

**Goal:** Predict per-slot expected earnings and disruption probability per rider.

**Inputs per micro-slot:**
- Historical earnings for that rider × zone × day × time (rolling 4 weeks).
- Zone-level weather, AQI, congestion forecast.
- Events/regulatory calendar.
- Platform signals: surge multiplier, store health, competitor rider density.
- Rider profile: tenure, rating, slot consistency.

**Model:** LightGBM / Gradient Boosting with time-of-week features.

**Outputs:**
- Expected earnings distribution for each slot.
- Disruption probability (earnings drop below threshold).
- Weekly premium suggestion per rider.

**Explainability:** "Your premium is higher this week because Thursday 7–9 PM in Zone 13
has a 65% flood probability based on monsoon forecast."

---

#### B. Parametric Trigger Calibration

**Problem:** Hard-coded thresholds (e.g., "rain > 40mm") are arbitrary and wrong for all cities.

**Solution:** Quantile regression / reliability curves trained on historical disruption data:
- Learn which *combinations* of signals correlate with severe earnings drops.
- Derive zone-specific, season-specific adaptive thresholds.
- Update as new claims data arrives — thresholds improve continuously.

---

#### C. Fraud Detection (Multi-Layer)

| Layer | Technique | What it catches |
|---|---|---|
| **Geo-consistency** | Cross-check GPS, network location, platform trip logs | Spoofing, impossible teleportation between zones |
| **Behavioural anomaly** | Isolation Forest over online/offline patterns | Riders who only go "online" during known disruption windows |
| **Peer comparison** | Counterfactual income estimator — compare to similar riders in same zone/slot | Outsized claims when peers earned normally |
| **Graph / collusion** | Network graph linking riders, devices, payout accounts | Clusters that always claim together in the same micro-zone |

Fraud engine runs **before** every payout. Suspicious claims are flagged for review; clear
cases are rejected automatically with a logged reason.

---

### 7.2 Advanced Roadmap (Conceptual Differentiators)

Explicitly marked as future phases — these are our north star, not our hackathon demo.

| Model | Purpose | Why Advanced |
|---|---|---|
| **Offline Deep RL (Conservative Q-Learning)** | Weekly premium optimization as a sequential decision problem — balances rider affordability vs portfolio loss ratio | Requires extensive historical policy data; avoids live trial-and-error on vulnerable users |
| **Physics-Informed Graph Neural Network (PI-GNN)** | Disruption Knowledge Graph (zones, roads, stores, events, payment rails as nodes; causal edges) — propagation model predicts second-order impacts | Requires graph DB, historical propagation data, significant training |
| **Causal AI / Anomaly Transformer** | Mathematically proves causal link between external shock and wallet-level income drop using cohort telemetry | High data requirements; research-grade fraud detection |

These models represent a credible, investor-grade roadmap even if not fully shipped in the hackathon.

---

### 7.3 AI Data Flow

```

External APIs → Kafka → Feature Store (Redis + TimescaleDB)
↓
Risk Model (LightGBM) → Premium per slot → Policy Service
↓
Trigger Service → Disruption Event
↓
Income Estimator → Claim Gap Calculation
↓
Fraud Model (Isolation Forest + Rules) → Approve / Flag / Reject
↓
Payout Service → UPI Credit

```

---

## 8. System Architecture

```

┌─────────────────────────────────────────────────────────────────┐
│                    RIDER MOBILE APP (PWA)                       │
│   Onboarding │ Slot Selection │ Policy │ Dashboard │ Alerts     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                      │
│  Rider Service │ Policy Service │ Claims Service │ Payout Svc   │
│  Risk Service  │ Fraud Service  │ Trigger Service               │
└──────┬──────────────────┬──────────────────────┬───────────────┘
       │                  │                      │
┌──────▼──────┐  ┌────────▼────────┐  ┌─────────▼───────────────┐
│ PostgreSQL  │  │  Kafka (Events) │  │  ML Service (FastAPI)    │
│ (Core Data) │  │  Time-Series DB │  │  Risk Model │ Fraud Model│
└─────────────┘  └────────┬────────┘  └─────────────────────────┘
                          │
              ┌───────────▼──────────────┐
              │  DATA COLLECTOR          │
              │  Weather │ Traffic       │
              │  Platform │ Payments     │
              │  Events │ Community Sig  │
              └──────────────────────────┘

```

### Core Domain Entities

- **Rider** — profile, zones, platform links, KYC status.
- **MicroSlot** — 30-min window with risk score and expected earnings.
- **Policy** — weekly coverage plan, active dates, premium paid.
- **DisruptionEvent** — zone × slot, trigger type, severity.
- **Claim** — rider × disruption, income gap, fraud status, payout amount.
- **Payout** — payment record, UPI reference, status.

---

## 9. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Mobile App** | React Native + Expo | Cross-platform iOS/Android, PWA behaviour, fast prototyping |
| **Admin Dashboard** | Next.js + TypeScript + Tailwind | SSR for data tables, rapid UI, type safety |
| **API Layer** | FastAPI (Python) | Async, auto-docs, native ML model serving |
| **ML/AI** | Python, Pandas, LightGBM, scikit-learn, PyTorch | v1 models + RL/GNN roadmap |
| **Primary DB** | PostgreSQL 15 | Relational core: riders, policies, claims, payouts |
| **Time-Series** | TimescaleDB / Redis | High-frequency external signal storage and caching |
| **Event Streaming** | Apache Kafka | Decouples ingestion from trigger evaluation |
| **Push Notifications** | Firebase Cloud Messaging | Real-time rider alerts on disruptions/payouts |
| **Payments** | Razorpay test mode / UPI simulator | India-native; simulated instant payout |
| **Weather** | OpenWeatherMap + IMD | Free tier, India coverage, rainfall/AQI/temp |
| **Traffic** | Google Maps / TomTom Traffic API | Real congestion data; fallback to mocks |
| **Platform Data** | Simulated / Mocked APIs | Dark store status, order volume — simulated for prototype |
| **Infra** | Docker + Docker Compose | One-command local deploy for demo and judges |

**Guidewire Integration Path (Future):**
- PolicyCenter (APD) for policy lifecycle management.
- ClaimCenter for zero-touch claim initiation via App Events / Webhooks.
- Jutro Digital Platform for enterprise mobile UI.
- Integration Gateway for external API orchestration.

---

## 10. Development Plan

### Phase 1 — Foundation *(Current)*

**Goal:** Working skeleton — riders onboard, buy policies, data flows in.

| Deliverable | Details |
|---|---|
| Rider onboarding + KYC flow | Name, phone, platform, zone, slot preferences |
| Policy service | Weekly plan selection, premium calculation (rule-based v0), UPI mock payment |
| Weather data pipeline | OpenWeatherMap polling every 5 min into TimescaleDB |
| Basic trigger rules | Rain > threshold, congestion > threshold — rule-based, no ML yet |
| Database schema | Riders, zones, micro-slots, policies, disruption events, claims |
| Mobile app shell | Onboarding, plan selection, policy status view |

**Exit criterion:** Rider can sign up, buy cover, and the system ingests live weather data.

---

### Phase 2 — Automation *(Core Product)*

**Goal:** Full zero-touch flow — disruption detected → claim → payout — working end-to-end.

| Deliverable | Details |
|---|---|
| Dynamic premium engine | LightGBM risk model on synthetic data, zone-level scoring |
| 5 automated triggers | Heavy rain, congestion, dark-store closure, platform outage, regulatory event |
| Community Signal agent | Detects mass order collapse across zone riders |
| Claims automation | Trigger → income gap calc → fraud check → payout |
| Mock payouts | Razorpay/UPI sandbox, push notification on payout |
| v1 fraud checks | Geo-consistency + peer comparison (rule-based + Isolation Forest) |
| 2-minute demo video | Onboarding → plan selection → simulated disruption → auto-payout |

**Exit criterion:** A 2-minute demo shows the complete parametric trigger → zero-touch payout flow.

---

### Phase 3 — Intelligence & Scale

**Goal:** Smart, observable, pitch-ready system.

| Deliverable | Details |
|---|---|
| Advanced fraud detection | Behavioural autoencoder, collusion graph, counterfactual estimator |
| Instant payouts | Full Razorpay sandbox with webhook reconciliation |
| Rider intelligent dashboard | Risk alerts, claim history, next-week risk forecast |
| Admin heatmap dashboard | Zone-wise loss ratios, fraud queue, payout analytics |
| Knowledge Graph v0 | Neo4j graph of zones, roads, stores, events — propagation logic |
| Model improvements | Temporal model upgrade (TCN/Transformer), self-calibrating thresholds |
| Final submission package | 5-minute demo + pitch deck + full repo with Docker Compose |

---

## 11. Competitive Differentiation

| Aspect | Typical Approach | RiderShield |
|---|---|---|
| **Disruption coverage** | Weather only | 12+ categories: algorithmic, regulatory, access, payments |
| **Pricing granularity** | Daily or flat weekly rate | 30–60 min micro-slot risk modeling |
| **Triggers** | Static, hand-tuned thresholds | Data-driven, self-calibrating per zone and season |
| **Fraud detection** | Simple GPS check | 4-layer: geo, behavioural, graph, counterfactual |
| **Unique triggers** | None | GPS multipath shadowbans, elevator bans, VIP blockades, uncompensated wait time |
| **Explainability** | Black box | Slot-level risk reasons shown to rider and insurer |
| **Claim process** | File → adjuster → wait | Zero-touch: trigger = claim = payout |

---

## 12. Business Viability

### Unit Economics (Per Rider, Monthly)

| Metric | Value |
|---|---|
| Weekly premium | ₹79 (avg, Balanced plan) |
| Monthly premium (4.3 weeks) | ₹340 |
| Disruption rate | ~15% of weeks have a claimable event |
| Average payout when disrupted | ₹450 |
| Expected monthly claims | ₹29 |
| Gross margin | ~32% |
| Net profit per rider/month | ~₹80 (after ops + fraud load) |

**Target Loss Ratio:** 65–70% (standard for parametric products).

### Market Opportunity

| Segment | Size |
|---|---|
| Q-commerce riders India (2026 est.) | ~150,000 |
| TAM (10% adoption @ ₹500/month) | ₹90 crores/year |
| SOM Year 1 (2% adoption, 3,000 riders) | ₹1.8 crores/year |

### Scaling Path

1. **Months 1–6:** Pilot in Bengaluru — 500 riders, 2 dark store clusters.
2. **Months 7–12:** Expand to 3 cities (Delhi, Mumbai, Hyderabad) — 3,000 riders.
3. **Year 2:** 10 cities, 15,000 riders, platform (Zepto/Blinkit) B2B2C partnerships.
4. **Year 3:** National coverage, extend to food-delivery and e-commerce riders.

**B2B2C Lever:** Platforms subsidise 30–50% of weekly premium as a rider retention/welfare
benefit — riders get near-free insurance, platforms reduce churn, we scale 10×.

### Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Adverse selection (only high-risk riders buy) | Micro-slot pricing makes high-risk coverage accurately priced |
| Catastrophic zone events (city-wide flood) | Reinsurance + aggregate stop-loss cap per zone |
| Model inaccuracy early on | Conservative loading (25%), continuous retraining, A/B testing |
| Fraud epidemic | 4-layer detection, manual review queue, payout caps per rider per week |

---

## 13. Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker + Docker Compose

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/ridershield.git
cd ridershield

# Start infrastructure (PostgreSQL, Redis, Kafka, TimescaleDB)
docker-compose up -d

# Backend API
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Admin dashboard
cd ../admin-dashboard
npm install
npm run dev

# Rider mobile app
cd ../mobile-app
npm install
npx expo start
```

### Environment Variables

```env
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/ridershield
REDIS_URL=redis://localhost:6379
OPENWEATHER_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
RAZORPAY_KEY_ID=your_test_key
RAZORPAY_KEY_SECRET=your_test_secret

# admin-dashboard/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000

# mobile-app/.env
API_URL=http://localhost:8000
```

### Repo Structure

```
ridershield/
├── backend/              # FastAPI — core services + ML models
│   ├── services/         # rider, policy, claims, fraud, payout
│   ├── ml/               # risk model, fraud model, trigger calibration
│   └── integrations/     # weather, traffic, platform, payment APIs
├── admin-dashboard/      # Next.js insurer/admin UI
├── mobile-app/           # React Native rider app
├── data/                 # Synthetic data + seed scripts
├── docker-compose.yml
└── docs/                 # Architecture diagrams, API docs
```

---

## Limitations & Future Work

- Phase 1–2 ML models run on **synthetic data**; real-world calibration requires platform
  partnerships and regulatory approval.
- Advanced models (Offline RL, PI-GNN, Causal AI) are **roadmap items**, not hackathon
  deliverables — we are transparent about this distinction.
- Production deployment requires IRDAI sandbox/regulatory clearance for insurance products
  in India.
- Reinsurance arrangements for catastrophic zone events are a commercial layer not built
  in the prototype.

---

*Built with ❤️ for India's 10M+ gig workers — the invisible backbone of quick commerce.
DEVTrails 2026 Hackathon Submission.*
```

***

The README is designed to be copied directly into your GitHub repo as `README.md`.  It strictly follows the hackathon judging rubric — persona scenarios and workflow first, then premium model and triggers, then platform justification, then AI/ML depth, then tech stack and dev plan — while keeping everything concise and judge-scannable. [ppl-ai-file-upload.s3.amazonaws](https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/59765090/13f1e4a1-2d46-42a8-9988-3f727532f642/README-1.md)
