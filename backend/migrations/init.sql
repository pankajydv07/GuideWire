-- ============================================================
-- RiderShield — Full Database Schema Initialization
-- Owner: Dev 1 (Rider Service)
-- Run: psql -U postgres -d ridershield -f migrations/init.sql
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ZONES (owned by Dev 1, read by everyone) ──────────────
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    flood_risk_score INTEGER DEFAULT 0,
    traffic_risk_score INTEGER DEFAULT 0,
    store_risk_score INTEGER DEFAULT 0,
    composite_risk_score INTEGER DEFAULT 0,
    lat DECIMAL(10, 8),
    lon DECIMAL(11, 8)
);

-- ─── RIDERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    platform VARCHAR(50) NOT NULL,   -- zepto | blinkit | swiggy
    city VARCHAR(50) NOT NULL,
    zone_id UUID NOT NULL REFERENCES zones(id),
    upi_id VARCHAR(100),
    kyc_status VARCHAR(20) DEFAULT 'pending',   -- pending | verified | rejected
    trust_score INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── RIDER RISK PROFILES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS rider_risk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID UNIQUE NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id),
    income_volatility DECIMAL(4, 2) DEFAULT 0,
    disruption_probability DECIMAL(4, 2) DEFAULT 0,
    four_week_earnings JSONB,           -- {"week_12": 4250, "week_11": 4100, ...}
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── RIDER ZONE BASELINES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS rider_zone_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id),
    week VARCHAR(10) NOT NULL,          -- e.g. "2026-W13"
    slot_time VARCHAR(20) NOT NULL,     -- e.g. "18:00-21:00"
    avg_earnings INTEGER NOT NULL,
    avg_orders INTEGER NOT NULL,
    disruption_count INTEGER DEFAULT 0,
    UNIQUE (rider_id, zone_id, week, slot_time)
);

-- ─── POLICIES (owned by Dev 2, defined here for FK references) ─
CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES riders(id),
    plan_tier VARCHAR(20) NOT NULL,     -- essential | balanced | max_protect
    week VARCHAR(10) NOT NULL,          -- "2026-W13"
    status VARCHAR(20) DEFAULT 'active',
    premium_paid INTEGER,
    coverage_percent INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    activated_at TIMESTAMP,
    expired_at TIMESTAMP
);

-- ─── DISRUPTION EVENTS (owned by Dev 3) ─────────────────────
CREATE TABLE IF NOT EXISTS disruption_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,    -- weather | platform_outage | traffic
    zone_id UUID REFERENCES zones(id),
    severity VARCHAR(20) DEFAULT 'medium',
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    source VARCHAR(100),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ─── CLAIMS (owned by Dev 4) ────────────────────────────────
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES riders(id),
    policy_id UUID REFERENCES policies(id),
    claim_type VARCHAR(50) NOT NULL,    -- auto | manual
    status VARCHAR(20) DEFAULT 'pending',
    amount_requested INTEGER,
    amount_approved INTEGER,
    disruption_event_id UUID REFERENCES disruption_events(id),
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- ─── PAYOUTS (owned by Dev 4) ───────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES claims(id),
    rider_id UUID NOT NULL REFERENCES riders(id),
    amount INTEGER NOT NULL,
    upi_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',   -- pending | processing | success | failed
    initiated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    transaction_ref VARCHAR(100)
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_riders_phone ON riders(phone);
CREATE INDEX IF NOT EXISTS idx_riders_zone_id ON riders(zone_id);
CREATE INDEX IF NOT EXISTS idx_policies_rider_id ON policies(rider_id);
CREATE INDEX IF NOT EXISTS idx_policies_week ON policies(week);
CREATE INDEX IF NOT EXISTS idx_claims_rider_id ON claims(rider_id);
CREATE INDEX IF NOT EXISTS idx_disruption_events_zone ON disruption_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_baselines_rider_week ON rider_zone_baselines(rider_id, week);
