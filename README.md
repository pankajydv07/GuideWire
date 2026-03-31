# RiderShield — Parametric Insurance for Quick-Commerce Delivery Riders

> **Automatic income protection for delivery riders.** When heavy rain, flooding, or traffic kills your earnings — RiderShield detects it and pays you. No claims. No paperwork. No waiting.

---

## Table of Contents

1. [What Is This?](#what-is-this)
2. [The Problem We're Solving](#the-problem-were-solving)
3. [How It Works — Rider's Perspective](#how-it-works--riders-perspective)
4. [Weekly Premium Model](#weekly-premium-model)
5. [Parametric Triggers — What Counts as a "Disruption"](#parametric-triggers--what-counts-as-a-disruption)
6. [Real Persona Scenarios](#real-persona-scenarios)
7. [Why a Mobile App (Not Web)](#why-a-mobile-app-not-web)
8. [AI and Machine Learning — How We Use It](#ai-and-machine-learning--how-we-use-it)
9. [System Architecture](#system-architecture)
10. [Tech Stack](#tech-stack)
11. [Development Plan](#development-plan)
12. [Unique Features](#unique-features)
13. [Getting Started](#getting-started)

---

## What Is This?

RiderShield is an insurance app built specifically for quick-commerce delivery riders — people who deliver for platforms like **Blinkit**, **Zepto**, and **Swiggy Instamart**.

These riders earn per delivery. When something outside their control happens — heavy rain, a road flooded, a store shut down — their orders drop and their income disappears. There's no sick leave, no employer safety net, no insurance that covers this.

**RiderShield fixes that.**

A rider pays a small weekly premium (as low as ₹15/week). The app constantly monitors weather, traffic, air quality, and store status in the rider's delivery zone. When conditions cross a threshold — say, rainfall goes above 40mm — the system automatically detects the disruption, calculates how much income the rider lost, and sends a payout directly to their wallet.

No forms. No phone calls. No "claim denied." The system *knows* it rained. It *knows* your orders dropped. It pays you.

---

## The Problem We're Solving

Quick-commerce delivery riders in India face a fundamental unfairness:

| Situation | What Happens | Who Pays the Price |
|-----------|-------------|-------------------|
| Heavy rain floods roads | Customers stop ordering, stores close | Rider earns ₹0 |
| Traffic gridlock from accident | Deliveries take 3x longer, fewer trips | Rider earns 30% of normal |
| Air quality index hits hazardous | Government advises staying indoors | Rider has no orders |
| Platform shuts a dark store | Riders assigned to that store have no work | Rider earns ₹0 |
| Government-declared curfew | Everything stops | Rider earns ₹0 |

Traditional insurance doesn't work here because:

- **No employer** — riders are gig workers, not employees
- **No fixed salary** — can't insure something that changes daily
- **Manual claims take weeks** — riders can't wait, they need money today
- **Hard to prove loss** — "it rained and I lost money" isn't something a normal insurer can verify

**Parametric insurance solves all of this.** Instead of proving a loss, the system uses measurable data (rainfall in mm, traffic congestion score, etc.) as automatic triggers. If the data says it happened, you get paid. Period.

---

## How It Works — Rider's Perspective

Here's what a rider actually experiences:

### Step 1: Sign Up (2 minutes)

1. Open the RiderShield app
2. Enter your name, phone number, and delivery platform (Blinkit/Zepto/Instamart)
3. Select your delivery zone (e.g., "Hyderabad — Gachibowli")
4. Done — you have an account

### Step 2: Buy Insurance (30 seconds)

1. You see a coverage card: **"₹15/week → Up to ₹800 coverage"**
2. Tap "Buy Coverage"
3. Pay ₹15 via UPI/card (Stripe test mode for now)
4. Your policy is active immediately

### Step 3: Keep Delivering (You Do Nothing)

- The app runs in the background
- It tracks weather, traffic, and conditions in your zone
- You just focus on your deliveries

### Step 4: Disruption Happens

- Heavy rain starts in your zone at 2 PM
- By 4 PM, rainfall crosses 40mm
- Your orders drop from the usual 12/hour to 3/hour
- **The system detects this automatically**

### Step 5: You Get Paid (No Action Required)

1. You get a notification: *"Disruption detected in Gachibowli — Heavy Rain"*
2. The system calculates your income loss
3. A second notification arrives: *"₹500 payout sent to your wallet"*
4. The money is in your in-app wallet
5. You can view the full breakdown: expected income, actual income, loss, payout

**That's it.** No forms, no photos of rain, no waiting 30 days. The data proved the disruption. You got paid.

---

## Weekly Premium Model

### How the Price Works

Every rider pays a **weekly premium** — a small amount at the start of each week that buys them coverage for 7 days.

| Component | Details |
|-----------|---------|
| **Billing frequency** | Weekly (every Monday) |
| **Base premium** | ₹15/week |
| **Coverage limit** | Up to ₹800/week |
| **Payout calculation** | Actual income loss, capped at the coverage limit |

### Why Weekly, Not Monthly?

- Riders think in days and weeks, not months. A ₹15 weekly payment feels manageable.
- Weekly pricing lets us adjust premiums dynamically — monsoon season might cost ₹20/week, dry season ₹10/week.
- If a rider skips a week (takes time off), they don't pay. Flexibility matters for gig workers.

### How the Premium Amount Is Decided

The premium isn't the same for everyone. It depends on **how risky your delivery zone is**:

| Factor | Example | Effect on Premium |
|--------|---------|-------------------|
| **Historical weather** | Zone gets 60+ rainy days/year | Premium goes up |
| **Traffic patterns** | Zone has daily gridlock hours | Premium goes up slightly |
| **Past disruptions** | Zone had 5 disruption events last month | Premium goes up |
| **Order density** | Zone has very high order volume | Premium may go down (more data = better prediction) |
| **Season** | Monsoon season (June–September) | Premium goes up |
| **Past claims** | Rider had 3 claims last month | Premium stays same (parametric = no moral hazard) |

The **Risk Prediction AI Model** crunches these numbers and produces a **risk score** (0–100) for each zone. That score maps to a premium:

| Risk Score | Zone Example | Weekly Premium |
|------------|-------------|----------------|
| 0–25 (Low) | Dry-season Bangalore suburb | ₹10 |
| 26–50 (Medium) | Normal Hyderabad zone | ₹15 |
| 51–75 (High) | Mumbai during pre-monsoon | ₹20 |
| 76–100 (Very High) | Coastal zone during cyclone season | ₹25 |

### Payout Calculation

When a disruption happens, the payout formula is simple:

```
Expected Income = (Average orders per hour) × (Hours disrupted) × (₹ per order)
Actual Income   = (Actual orders during disruption) × (₹ per order)
Income Loss     = Expected Income - Actual Income
Payout          = min(Income Loss, Coverage Limit)
```

**Example:**
- Rohit averages 12 orders/hour, ₹15/order
- Disruption lasted 4 hours
- Expected: 12 × 4 × 15 = ₹720
- Actual (only 3 orders/hour): 3 × 4 × 15 = ₹180
- Loss: ₹720 - ₹180 = ₹540
- Coverage limit: ₹800
- **Payout: ₹540** (loss is below the limit, so full loss is covered)

---

## Parametric Triggers — What Counts as a "Disruption"

A **parametric trigger** is a measurable, objective condition that automatically activates insurance coverage. No human judgment involved — if the number crosses the line, the system acts.

### Our Triggers

| Category | Trigger | Threshold | Data Source |
|----------|---------|-----------|-------------|
| **Weather** | Rainfall | > 40mm in the zone | OpenWeatherMap API |
| **Weather** | Extreme heat | Temperature > 42°C | OpenWeatherMap API |
| **Air Quality** | AQI (pollution) | > 300 (hazardous) | OpenWeatherMap API |
| **Traffic** | Congestion index | > 80 (severe gridlock) | Google Maps Traffic API |
| **Traffic** | Road blockage | road_block = TRUE | Google Maps Traffic API |
| **Infrastructure** | Dark store closure | store_status = CLOSED | Platform API (simulated) |
| **Infrastructure** | Inventory shortage | stock_level = CRITICAL | Platform API (simulated) |
| **Government** | Curfew | curfew_active = TRUE | Manual/news feed entry |
| **Community Signal** | Rider order drop | > 70% drop across zone riders | Internal rider activity data |

### Why These Thresholds?

- **40mm rainfall** — At this level, roads in Indian cities begin flooding. Waterlogging makes deliveries unsafe and impractical. Below 40mm, riders can still operate with rain gear.
- **42°C temperature** — Government heat advisories typically trigger at this level. Rider safety concern.
- **AQI > 300** — "Hazardous" on the AQI scale. Health risk for anyone outdoors for extended periods.
- **Traffic index > 80** — At this congestion level, a 10-minute delivery takes 30+ minutes. Riders can barely complete 3-4 orders per hour instead of 12.
- **70% order drop** — This is our "Community Signal" trigger. If most riders in a zone simultaneously see their orders collapse, something major happened — even if external APIs haven't caught it yet.

### How Triggers Combine

Triggers don't need to occur in isolation. The system evaluates them independently:

- **Single trigger fires?** → Disruption detected, claims process starts
- **Multiple triggers fire?** → Still one disruption event (no double-counting)
- **Trigger fires but rider orders are normal?** → No claim (rider wasn't affected)

---

## Real Persona Scenarios

### Scenario 1: Rohit — Heavy Rain in Hyderabad

**Who:** Rohit, Blinkit rider, Gachibowli zone, averages 100 orders/day (₹15/order = ₹1,500/day income)

**What happens:**
- Tuesday afternoon, heavy rain begins in Gachibowli
- By 3 PM, rainfall hits 52mm — crosses the 40mm trigger
- Rohit's orders drop from ~12/hour to 3/hour
- He works from 3 PM to 7 PM (4 hours) but barely gets orders

**System response:**
1. ⚡ Weather API reports 52mm rainfall in Gachibowli → **Trigger fires**
2. Disruption Detection Agent creates a disruption event for the zone
3. Claim Automation Agent identifies Rohit as an insured rider in this zone
4. Income Loss Estimator calculates: Expected ₹720, Actual ₹180, Loss = ₹540
5. Fraud Detection checks Rohit's GPS (was he actually in the zone?) → ✓ Clear
6. **Payout: ₹540 sent to Rohit's wallet**
7. Rohit gets a push notification with the breakdown

**Rohit's experience:** He's sitting at home watching rain. His phone buzzes: "₹540 deposited — Heavy Rain disruption in Gachibowli." He didn't do anything.

---

### Scenario 2: Priya — Dark Store Shutdown in Delhi

**Who:** Priya, Zepto rider, Rajouri Garden zone, averages 80 orders/day

**What happens:**
- Wednesday morning, Priya's assigned dark store shuts down unexpectedly (equipment failure)
- No orders are dispatched from that store
- Priya has no deliveries from 10 AM to 2 PM (4 hours)

**System response:**
1. Platform API reports store_status = CLOSED for Rajouri Garden dark store → **Trigger fires**
2. Disruption event created
3. Priya identified as affected rider
4. Income loss: Expected ₹300 (4 hours × 10 orders/hour × ₹7.5/order), Actual ₹0, Loss = ₹300
5. Fraud check: Priya's GPS shows she was near the store area → ✓ Clear
6. **Payout: ₹300**

---

### Scenario 3: Community Signal — Mass Order Drop in Mumbai

**Who:** 45 Instamart riders in Andheri West zone

**What happens:**
- Sunday evening, a major water main breaks, flooding several streets
- No weather trigger fires (it's not raining)
- No traffic API picks it up yet
- But across 45 riders in the zone, orders drop by 82% in one hour

**System response:**
1. No external API triggers fire
2. Community Signal Agent detects: 82% average order drop across 45 riders → **Trigger fires**
3. Disruption event created for Andheri West
4. All 45 insured riders get individual claims
5. Each claim calculated based on their personal expected vs actual income
6. Fraud check on each claim
7. **Payouts distributed to all affected riders**

This is what makes our Community Signal unique — it catches disruptions that no weather or traffic API can see.

---

### Scenario 4: Fraud Attempt — Arjun Tries to Game the System

**Who:** Arjun, rider who stays home on a sunny day and claims low orders

**What happens:**
- Nice weather, normal traffic, all stores are open
- Arjun simply doesn't go out to deliver
- No triggers fire in his zone

**System response:**
1. No parametric triggers activate → **No disruption event**
2. No automatic claim is generated
3. Even if Arjun could somehow file a manual claim, the Fraud Detection Agent checks:
   - GPS: Arjun wasn't in his delivery zone → ✗ Flag
   - Zone disruption: None detected → ✗ Flag
   - Peer comparison: Other riders in the zone had normal orders → ✗ Flag
4. **Claim rejected. No payout.**

Parametric insurance is inherently fraud-resistant — you can't fake the weather.

---

## Why a Mobile App (Not Web)

We chose to build a **mobile app** (React Native / Expo) for the rider-facing side. Here's why:

| Factor | Mobile App | Web App |
|--------|-----------|---------|
| **Rider's primary device** | Phone (always in hand while delivering) | Rarely opens a laptop |
| **Push notifications** | Native push — instant disruption/payout alerts | Browser notifications — unreliable, often blocked |
| **Background location** | Can verify rider GPS in real-time | Cannot track location |
| **Always accessible** | Home screen icon, one tap | Must remember URL, open browser |
| **Offline resilience** | Can cache policy info locally | Nothing works offline |
| **Payment integration** | Can integrate with UPI/wallet apps directly | Redirects to payment pages |

**The deciding factor:** Riders *live on their phones*. They check earnings, track deliveries, and navigate using their phone. A web app would feel like a side project. A mobile app feels like a tool built for them.

**The Admin Dashboard** is built as a web app (Next.js) because admins sit at desks, use monitors, and need data-dense layouts that work better on large screens.

---

## AI and Machine Learning — How We Use It

RiderShield uses AI/ML in four specific places. Here's exactly what each does and why:

### 1. Risk Prediction Model (Sets the Premium Price)

**What it does:** Predicts how likely a disruption is for a specific delivery zone in the coming week.

**How it works:**
- Looks at 6 months of historical data for the zone: past weather, traffic patterns, store closures, order volumes
- Produces a **risk score** from 0–100
- That score determines the rider's weekly premium (higher risk = slightly higher premium)

**Model type:** Gradient Boosted Trees (XGBoost)

**Input features:**
| Feature | Example |
|---------|---------|
| Historical rainfall (past 30 days) | 120mm total |
| Average traffic congestion | Score 45/100 |
| Number of past disruption events | 3 last month |
| Order density in the zone | 500 orders/day |
| Season indicator | Monsoon = 1 |
| Day of week patterns | Weekday = 1 |

**Output:** Risk score → Premium amount

**Why this matters:** Without this model, every rider would pay the same premium regardless of zone risk. That's unfair — a rider in a flood-prone area shouldn't pay the same as one in an area that rarely gets rain. The model makes pricing fair.

---

### 2. Disruption Detection Agent (Decides When Something Goes Wrong)

**What it does:** Continuously monitors external data and rider activity, decides when a "disruption" has occurred.

**How it works:**
- Every 5 minutes, the Data Collector Agent pulls fresh data from weather, traffic, and platform APIs
- The Disruption Detection Agent checks each zone against the parametric trigger thresholds
- If any trigger is breached, it creates a **disruption event**

**Built with:** LangGraph + LangChain (stateful agent workflow)

**Agent flow:**
```
Data Collector → checks weather, traffic, AQI, store status
       ↓
Disruption Detector → compares against thresholds
       ↓
  [TRIGGER MET?]
       ↓ Yes                    ↓ No
Create Disruption Event     Wait 5 minutes, check again
```

**Why AI agents, not simple rules?** The Community Signal detection requires reasoning across multiple riders' activity patterns simultaneously. Also, as we add more trigger types, agents can compose rules flexibly without hardcoding every combination.

---

### 3. Fraud Detection Model (Catches Bad Claims)

**What it does:** Screens every automatic claim before payout to catch anomalies.

**How it works:**
- Takes each claim and looks for patterns that don't match normal behavior
- Uses an **Isolation Forest** algorithm — it learns what "normal" looks like and flags anything unusual

**What it checks:**
| Check | What It Looks For | Red Flag Example |
|-------|-------------------|------------------|
| **GPS validation** | Was the rider actually in their claimed zone? | Rider's GPS shows them 20km away |
| **Activity pattern** | Does the rider's delivery pattern match their history? | Rider normally does 80 orders, suddenly claims 0 on a sunny day |
| **Peer comparison** | Are other riders in the zone also affected? | Only this one rider claims disruption, 50 others are fine |
| **Duplicate check** | Has this rider already claimed for this event? | Same zone, same time window, second claim |
| **Timing check** | Does the claim timing match the disruption window? | Disruption was 2–4 PM, rider claims 8 AM loss |

**Model type:** Isolation Forest (unsupervised anomaly detection)

**Why Isolation Forest?** It doesn't need labeled fraud data to start working (we won't have fraud examples on day 1). It learns the shape of "normal" claims and automatically finds outliers. As we collect more data, the model gets better.

---

### 4. Income Loss Estimator (Calculates How Much to Pay)

**What it does:** Figures out exactly how much income a specific rider lost during a specific disruption.

**How it works:**
- Looks at the rider's historical order pattern (same day of week, same hours)
- Calculates what they *should have earned* during the disruption window
- Compares to what they *actually earned*
- The difference is the loss

**Calculation:**
```
Expected Orders = Average orders for (day_of_week, hour_range) over past 4 weeks
Expected Income = Expected Orders × Average earning per order
Actual Income   = Actual orders completed during disruption × Average earning per order
Income Loss     = Expected Income - Actual Income
Payout          = min(Income Loss, Coverage Limit)
```

**Why per-rider calculation?** Every rider has different order volumes. A rider averaging ₹2,000/day loses more than one averaging ₹800/day from the same rainstorm. The payout should match *your* loss, not some flat number.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │  Rider Mobile App │     │  Admin Dashboard (Next.js)       │  │
│  │  (React Native)   │     │  - Disruption heatmap            │  │
│  │  - Buy coverage   │     │  - Claims monitoring             │  │
│  │  - View payouts   │     │  - Fraud alerts                  │  │
│  │  - Notifications  │     │  - Payout analytics              │  │
│  └────────┬─────────┘     └──────────────┬───────────────────┘  │
│           │                              │                      │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (FastAPI)                       │
│  ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │  Rider   │ │  Policy    │ │   Order    │ │   Claim       │  │
│  │ Service  │ │  Service   │ │  Activity  │ │   Service     │  │
│  │          │ │            │ │  Service   │ │               │  │
│  └──────────┘ └────────────┘ └────────────┘ └───────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI DECISION LAYER                            │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │ Data Collector    │────▶│ Disruption Detection Agent       │  │
│  │ Agent (5-min poll)│     │ (checks triggers)                │  │
│  └──────────────────┘     └──────────────┬───────────────────┘  │
│                                          │                      │
│  ┌──────────────────┐                    ▼                      │
│  │ Community Signal  │     ┌──────────────────────────────────┐  │
│  │ Agent (order-drop │────▶│ Claim Automation Agent           │  │
│  │  detection)       │     │ (creates claims automatically)   │  │
│  └──────────────────┘     └──────────────┬───────────────────┘  │
│                                          │                      │
│  ┌──────────────────┐                    ▼                      │
│  │ Risk Prediction  │     ┌──────────────────────────────────┐  │
│  │ Model (premiums) │     │ Fraud Detection Agent             │  │
│  └──────────────────┘     │ (Isolation Forest)                │  │
│                           └──────────────┬───────────────────┘  │
│                                          │                      │
│                                          ▼                      │
│                           ┌──────────────────────────────────┐  │
│                           │ Payout Agent                      │  │
│                           │ (sends money via Stripe)          │  │
│                           └──────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                           │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │
│  │ PostgreSQL │ │  Redis   │ │  Kafka   │ │ Stripe (test)   │  │
│  │ (primary   │ │ (cache,  │ │ (event   │ │ (simulated      │  │
│  │  database) │ │  queues) │ │  stream) │ │  payments)      │  │
│  └────────────┘ └──────────┘ └──────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EXTERNAL DATA SOURCES                           │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ OpenWeatherMap   │ │ Google Maps      │ │ Platform APIs   │  │
│  │ (weather + AQI)  │ │ (traffic data)   │ │ (simulated)     │  │
│  └──────────────────┘ └──────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow (Step by Step)

1. **External APIs** send real-time weather, traffic, and dark store status data every 5 minutes
2. **Data Collector Agent** stores incoming data into the Kafka event stream
3. **Disruption Detection Agent** reads from Kafka and evaluates parametric trigger rules per zone
4. If triggers are satisfied, a **disruption event** is created in PostgreSQL
5. **Claim Automation Agent** finds all riders with active policies operating in the affected zone
6. Rider delivery activity is analyzed to **estimate income loss** per rider
7. **Fraud Detection Model** validates each claim (GPS, activity, duplicates)
8. **Payout Agent** sends compensation to rider wallet via Stripe (test mode)
9. Rider receives a **push notification** through the mobile app with payout details

---

## Tech Stack

| Layer | Technology | Why We Chose It |
|-------|-----------|-----------------|
| **Rider Mobile App** | React Native + Expo | Cross-platform (iOS + Android) from one codebase. JS ecosystem = shares types with backend. Expo for fast prototyping. |
| **Admin Dashboard** | Next.js + TypeScript + Tailwind CSS | Server-rendered React for fast data dashboards. Tailwind for rapid UI. TypeScript for type safety. |
| **Backend API** | FastAPI (Python) | Async Python — ideal for ML/AI integration. Auto-generated API docs. Fast. |
| **AI Agents** | LangGraph + LangChain | Stateful multi-step agent workflows. Built for exactly this kind of orchestration. |
| **ML Models** | Scikit-learn + PyTorch | Scikit-learn for Isolation Forest (fraud). PyTorch for risk prediction if complexity grows. |
| **Primary Database** | PostgreSQL | Rock-solid relational DB. Perfect for riders, policies, claims, payouts. |
| **Cache / Queues** | Redis | Fast caching for real-time trigger state. Pub/sub for notifications. |
| **Event Streaming** | Kafka | Decouples data ingestion from processing. Handles real-time weather/traffic data flow. |
| **Payments** | Stripe (test mode) | Simulated payouts for prototype. Easy to switch to production later. |
| **Weather Data** | OpenWeatherMap API | Free tier available. Covers rainfall, temperature, AQI. Global coverage including India. |
| **Traffic Data** | Google Maps Traffic API | Real traffic congestion data. Can fall back to mocks if API quota is limited. |
| **Platform Data** | Simulated / Mocked | Dark store status, rider activity — simulated for prototype. Real integration in production. |

---

## Development Plan

### Phase 1 — Foundation (Core Backend + Rider Onboarding)

Build the backbone: riders can sign up, buy a policy, and the system starts collecting data.

| What We Build | Details |
|---------------|---------|
| Rider Service | Registration, authentication, zone assignment |
| Policy Service | Weekly premium purchase, coverage activation |
| Weather API Integration | OpenWeatherMap polling every 5 minutes |
| Database Schema | Riders, policies, zones, weather data tables |
| Basic Mobile App Shell | Sign up, buy coverage, view policy status |

**After Phase 1:** A rider can sign up and buy insurance. Weather data is flowing in.

---

### Phase 2 — Automation (Disruption Detection + Automatic Claims)

The core intelligence: detect disruptions and create claims without human intervention.

| What We Build | Details |
|---------------|---------|
| Data Collector Agent | Polls all external APIs, pushes to Kafka |
| Disruption Detection Agent | Evaluates parametric triggers, creates disruption events |
| Claim Automation Agent | Identifies affected riders, calculates income loss, creates claims |
| Payout Simulation | Stripe test mode wallet payouts |
| Push Notifications | Rider gets notified on disruption + payout |
| Community Signal Agent | Detects disruptions from rider order-drop patterns |

**After Phase 2:** The system automatically detects disruptions, creates claims, and sends (simulated) money. The core product works end-to-end.

---

### Phase 3 — Intelligence + Operations (Fraud, Risk, Admin)

Make it smart and observable: AI-powered fraud detection, dynamic premiums, and an admin dashboard.

| What We Build | Details |
|---------------|---------|
| Fraud Detection Model | Isolation Forest for anomaly detection on claims |
| Risk Prediction Model | Zone risk scoring for dynamic premium calculation |
| Admin Dashboard | Disruption heatmap, claims feed, payout analytics, fraud alerts |
| Analytics APIs | Aggregated data for admin views |
| Dynamic Premium Engine | Risk score → premium amount mapping |

**After Phase 3:** Full system — intelligent fraud detection, fair pricing, and operational visibility.

---

## Unique Features

### 1. Community Signal Detection

Most parametric insurance relies entirely on external data (weather stations, government reports). But what if there's a localized disruption that no API catches — a water main break, a local road closure, a neighborhood power outage?

**Our solution:** If 70%+ of riders in a zone simultaneously experience order drops, the system detects a disruption *from the rider activity itself*. No external API needed. The community *is* the sensor.

### 2. Predictive Risk Alerts

The Risk Prediction Model doesn't just set premiums — it can **warn riders ahead of time**.

Example: "⚠️ High disruption probability (78%) tomorrow in Gachibowli — monsoon intensification expected."

Riders can plan accordingly (take the day off, work in a different zone) even before disruption hits.

### 3. Zero-Claim Insurance

Traditional insurance requires you to file a claim, provide evidence, and wait. RiderShield has **no claims process**. The data is the evidence. The trigger is the claim. The payout is automatic.

### 4. Dynamic Coverage

During high-risk periods (monsoon season, festival traffic), the system can offer temporary increased coverage — higher limits for slightly higher premiums — because the Risk Prediction Model knows that disruptions are more likely.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker + Docker Compose (recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/ridershield.git
cd ridershield

# Start infrastructure (PostgreSQL, Redis, Kafka)
docker-compose up -d

# Set up the backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Set up the admin dashboard
cd ../admin-dashboard
npm install
npm run dev

# Set up the mobile app
cd ../mobile-app
npm install
npx expo start
```

### Environment Variables

Create `.env` files in each service directory:

```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/ridershield
REDIS_URL=redis://localhost:6379
STRIPE_TEST_KEY=sk_test_...
OPENWEATHER_API_KEY=your_key_here
GOOGLE_MAPS_API_KEY=your_key_here

# Admin Dashboard (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Mobile App (.env)
API_URL=http://localhost:8000
```

---

## License

This project is a hackathon prototype. Built for demonstration purposes.

---

*Built with ❤️ for India's 10M+ gig workers who deserve financial protection.*
