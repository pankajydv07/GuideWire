import type {
  AutoClaim,
  DashboardStats,
  DisruptionEvent,
  ManualClaimReview,
  OverviewData,
  TriggerStatusResponse,
  Zone,
} from "@/lib/types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_STORAGE_KEY = "zylo_admin_token";

function computeDashboardStats(
  autoClaims: AutoClaim[],
  manualClaims: ManualClaimReview[],
  triggerStatus: TriggerStatusResponse,
): DashboardStats {
  const totalClaims = autoClaims.length + manualClaims.length;
  const totalPayouts = autoClaims.reduce((sum, claim) => sum + (claim.payout_amount || 0), 0);
  const totalIncomeLoss = autoClaims.reduce((sum, claim) => sum + (claim.income_loss || 0), 0);

  return {
    total_claims: totalClaims,
    pending_review: manualClaims.filter((claim) => claim.review_status === "pending").length,
    active_triggers: triggerStatus.active_triggers.length,
    loss_ratio: totalIncomeLoss > 0 ? totalPayouts / totalIncomeLoss : 0,
    total_payouts: totalPayouts,
    total_income_loss: totalIncomeLoss,
  };
}

class AdminApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  }

  async autoLogin() {
    if (this.token) return this.token;

    const response = await this.login("admin", "admin123");
    this.setToken(response.access_token);
    return response.access_token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retryOnUnauthorized = true,
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (res.status === 401 && retryOnUnauthorized) {
      this.setToken(null);
      await this.autoLogin();
      return this.request<T>(method, path, body, false);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message =
        err?.error?.message ||
        err?.detail?.message ||
        err?.detail ||
        `API Error: ${res.status}`;
      throw new Error(message);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  login(username: string, password: string) {
    return this.request<{ access_token: string; token_type: string }>(
      "POST",
      "/api/admin/login",
      { username, password },
      false,
    );
  }

  claims = {
    listAll: () => this.request<{ claims: AutoClaim[] }>("GET", "/api/admin/claims/auto"),
    listManual: (sort = "spam_score", order = "asc") =>
      this.request<{ claims: ManualClaimReview[] }>(
        "GET",
        `/api/admin/claims/manual?sort=${encodeURIComponent(sort)}&order=${encodeURIComponent(order)}`,
      ),
    approve: (claimId: string) => this.request<{ claim_id: string; status: string; payout_id?: string }>(
      "POST",
      `/api/admin/claims/${claimId}/approve`,
    ),
    reject: (claimId: string, reason: string) =>
      this.request<{ claim_id: string; status: string; reason: string }>(
        "POST",
        `/api/admin/claims/${claimId}/reject`,
        { reason },
      ),
  };

  triggers = {
    getStatus: () => this.request<TriggerStatusResponse>("GET", "/api/triggers/status"),
    getDisruptionEvents: (zone?: string) =>
      this.request<{ events: DisruptionEvent[]; total: number }>(
        "GET",
        zone ? `/api/triggers/disruption-events?zone=${encodeURIComponent(zone)}` : "/api/triggers/disruption-events",
      ),
    inject: (data: {
      trigger_type: string;
      zone: string;
      rainfall_mm?: number;
      duration_seconds?: number;
      congestion_index?: number;
    }) => this.request("POST", "/api/triggers/inject", data),
  };

  zones = {
    list: () => this.request<{ zones: Zone[] }>("GET", "/api/zones"),
  };

  config = {
    get: () =>
      this.request<{
        platforms: { id: string; name: string; icon: string }[];
        trigger_types: { type: string; label: string; icon: string }[];
      }>("GET", "/api/config"),
  };

  stats = {
    overview: async (): Promise<OverviewData> => {
      await this.autoLogin();
      const [autoClaimsResponse, manualClaimsResponse, triggerStatus] = await Promise.all([
        this.claims.listAll(),
        this.claims.listManual(),
        this.triggers.getStatus(),
      ]);

      const autoClaims = autoClaimsResponse.claims;
      const manualClaims = manualClaimsResponse.claims;

      return {
        autoClaims,
        manualClaims,
        triggerStatus,
        stats: computeDashboardStats(autoClaims, manualClaims, triggerStatus),
      };
    },
  };

  health() {
    return this.request<{
      status: string;
      postgres: string;
      redis: string;
      trigger_scheduler_cycles: number;
      timestamp: string;
    }>("GET", "/health", undefined, false);
  }
}

export const adminApi = new AdminApiClient();
