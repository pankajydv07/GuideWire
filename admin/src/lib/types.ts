export type ClaimStatus = "pending" | "approved" | "rejected" | "paid" | "under_review";

export type TriggerType =
  | "heavy_rain"
  | "traffic_congestion"
  | "store_closure"
  | "platform_outage"
  | "regulatory_curfew"
  | "gps_shadowban"
  | "dark_store_queue"
  | "algorithmic_shock"
  | "community_signal";

export interface AutoClaim {
  id: string;
  rider_id: string;
  rider_name?: string | null;
  type: "auto" | "manual";
  disruption_type?: string | null;
  income_loss: number;
  payout_amount: number;
  fraud_score: number;
  status: ClaimStatus;
  created_at: string;
}

export interface ManualClaimReview {
  id: string;
  claim_id: string | null;
  rider_id: string;
  rider_name?: string | null;
  zone_name?: string | null;
  disruption_type: string;
  description?: string | null;
  photo_path?: string | null;
  photo_url?: string | null;
  spam_score: number;
  geo_valid: boolean;
  gps_distance_m?: number | null;
  weather_match?: boolean | null;
  traffic_match?: boolean | null;
  review_status: string;
  reviewer_notes?: string | null;
  created_at: string;
}

export interface ActiveTrigger {
  trigger_id: string;
  type: string;
  zone: string;
  zone_id: string;
  threshold: string;
  active_since: string;
  affected_riders: number;
  severity: string;
}

export interface CommunitySignal {
  zone: string;
  zone_id: string;
  affected_pct: number;
  threshold_pct: number;
  affected_riders: number;
  total_riders: number;
  detected_at: string;
}

export interface TriggerStatusResponse {
  active_triggers: ActiveTrigger[];
  community_signals: CommunitySignal[];
  last_evaluation: string;
}

export interface DisruptionEvent {
  event_id: string;
  trigger_type: string;
  zone: string;
  zone_id: string;
  slot: string;
  severity: string;
  affected_riders: number;
  data?: Record<string, unknown> | null;
  created_at: string;
}

export interface Zone {
  id: string;
  name: string;
  city: string;
  risk_score: number;
}

export interface DashboardStats {
  total_claims: number;
  pending_review: number;
  active_triggers: number;
  loss_ratio: number;
  total_payouts: number;
  total_income_loss: number;
}

export interface OverviewData {
  autoClaims: AutoClaim[];
  manualClaims: ManualClaimReview[];
  triggerStatus: TriggerStatusResponse;
  stats: DashboardStats;
}

export const TRIGGER_LABELS: Record<string, string> = {
  heavy_rain: "Heavy Rain",
  traffic_congestion: "Traffic Congestion",
  store_closure: "Store Closure",
  platform_outage: "Platform Outage",
  regulatory_curfew: "Regulatory Curfew",
  gps_shadowban: "GPS Shadowban",
  dark_store_queue: "Dark Store Queue",
  algorithmic_shock: "Algorithmic Shock",
  community_signal: "Community Signal",
};

export const TRIGGER_EMOJI: Record<string, string> = {
  heavy_rain: "🌧️",
  traffic_congestion: "🚗",
  store_closure: "🏪",
  platform_outage: "📱",
  regulatory_curfew: "🚫",
  gps_shadowban: "📍",
  dark_store_queue: "🛒",
  algorithmic_shock: "📈",
  community_signal: "📣",
};

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-950/70 text-amber-300 ring-1 ring-amber-800/80",
  under_review: "bg-violet-950/70 text-violet-300 ring-1 ring-violet-800/80",
  approved: "bg-sky-950/70 text-sky-300 ring-1 ring-sky-800/80",
  paid: "bg-emerald-950/70 text-emerald-300 ring-1 ring-emerald-800/80",
  rejected: "bg-red-950/70 text-red-300 ring-1 ring-red-800/80",
};
