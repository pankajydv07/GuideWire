/**
 * RiderShield API Client — shared across all mobile screens.
 * 
 * Every dev imports from here:
 *   import { api } from '@/services/api';
 *   const data = await api.riders.getMe();
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: any,
    isFormData = false
  ): Promise<T> {
    const headers: Record<string, string> = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    };

    const res = await fetch(`${API_BASE}${path}`, config);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
      throw new Error(error?.error?.message || `API Error: ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  // ─── Dev 1: Rider Endpoints ─────────────────────
  riders = {
    sendOtp: (phone: string) =>
      this.request<{ message: string; expires_in: number }>('POST', '/api/riders/send-otp', { phone }),

    verifyOtp: (phone: string, otp: string) =>
      this.request<{ valid: boolean; temp_token: string }>('POST', '/api/riders/verify-otp', { phone, otp }),

    register: (data: { name: string; platform: string; city: string; zone: string; slots: string[]; upi_id: string }) =>
      this.request<any>('POST', '/api/riders/register', data),

    onboard: (data: { typical_slots: string[]; plan_tier: string }) =>
      this.request<any>('POST', '/api/riders/onboard', data),

    getMe: () =>
      this.request<any>('GET', '/api/riders/me'),

    getRiskProfile: () =>
      this.request<any>('GET', '/api/riders/me/risk-profile'),
  };

  // ─── Dev 1: Zones ───────────────────────────────
  zones = {
    list: () =>
      this.request<{ zones: any[] }>('GET', '/api/zones'),
  };

  // ─── Dev 2: Policy Endpoints ────────────────────
  policies = {
    getQuote: (slots: string, city: string) =>
      this.request<any>('GET', `/api/policies/quote?slots=${encodeURIComponent(slots)}&city=${encodeURIComponent(city)}`),

    create: (data: { plan_tier: string; payment_method: string; upi_id: string }) =>
      this.request<any>('POST', '/api/policies', data),

    getActive: () =>
      this.request<any>('GET', '/api/policies/active'),

    getById: (policyId: string) =>
      this.request<any>('GET', `/api/policies/${policyId}`),

    renew: (policyId: string) =>
      this.request<any>('PUT', `/api/policies/${policyId}/renew`),

    cancel: (policyId: string) =>
      this.request<void>('DELETE', `/api/policies/${policyId}`),
  };

  // ─── Dev 2: Premium ─────────────────────────────
  risk = {
    getPremium: (data: { zone: string; slots: string[]; plan_tier: string; rider_tenure_days: number }) =>
      this.request<any>('POST', '/api/risk/premium', data),
  };

  // ─── Dev 3: Triggers ────────────────────────────
  triggers = {
    getStatus: () =>
      this.request<any>('GET', '/api/triggers/status'),

    getDisruptionEvents: (zone?: string, from?: string) => {
      const params = new URLSearchParams();
      if (zone) params.set('zone', zone);
      if (from) params.set('from', from);
      return this.request<any>('GET', `/api/triggers/disruption-events?${params}`);
    },
  };

  // ─── Dev 4: Claims ──────────────────────────────
  claims = {
    list: () =>
      this.request<{ claims: any[] }>('GET', '/api/claims'),

    getById: (claimId: string) =>
      this.request<any>('GET', `/api/claims/${claimId}`),
  };

  // ─── Dev 4: Payouts ─────────────────────────────
  payouts = {
    list: () =>
      this.request<{ payouts: any[] }>('GET', '/api/payouts'),
  };

  // ─── Dev 5: Manual Claims ──────────────────────
  manualClaims = {
    submit: (formData: FormData) =>
      this.request<any>('POST', '/api/claims/manual', formData, true),

    getStatus: (claimId: string) =>
      this.request<any>('GET', `/api/claims/manual/${claimId}`),
  };

  // ─── Health ─────────────────────────────────────
  health = () =>
    this.request<any>('GET', '/health');
}

export const api = new ApiClient();
