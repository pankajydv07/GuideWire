/**
 * RiderShield Admin API Client
 * 
 * Usage:
 *   import { adminApi } from '@/lib/api';
 *   const claims = await adminApi.claims.listManual();
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class AdminApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API Error: ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  // Admin login (generates admin JWT)
  login = async (username: string, password: string) => {
    // For hackathon: hardcode admin JWT creation on backend
    return this.request<{ token: string }>('POST', '/api/admin/login', { username, password });
  };

  claims = {
    listAll: () => this.request<{ claims: any[] }>('GET', '/api/admin/claims'),
    listManual: (sort = 'spam_score', order = 'asc') =>
      this.request<{ claims: any[] }>('GET', `/api/admin/claims/manual?sort=${sort}&order=${order}`),
    approve: (claimId: string) =>
      this.request<any>('POST', `/api/admin/claims/${claimId}/approve`),
    reject: (claimId: string, reason: string) =>
      this.request<any>('POST', `/api/admin/claims/${claimId}/reject`, { reason }),
  };

  triggers = {
    getStatus: () => this.request<any>('GET', '/api/triggers/status'),
    inject: (data: { trigger_type: string; zone: string; rainfall_mm?: number; duration_seconds?: number }) =>
      this.request<any>('POST', '/api/triggers/inject', data),
  };

  health = () => this.request<any>('GET', '/health');
}

export const adminApi = new AdminApiClient();
