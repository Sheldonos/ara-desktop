/**
 * ARA Cloud Client SDK
 * Used by ARA Desktop to communicate with the ARA Cloud managed backend.
 * Handles registration, login, key provisioning, proxy calls, and usage reporting.
 */

export interface AraCloudConfig {
  baseUrl: string;
  token?: string;
  apiKey?: string;
}

export interface AraCloudClient {
  email: string;
  name: string;
  tier: "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  status: string;
}

export interface ProvisionedKey {
  keyId: string;
  key: string;
  keyPrefix: string;
  label: string;
  createdAt: string;
  message: string;
}

export interface UsageSummary {
  monthly: { tokens: number; costUsd: number; requests: number };
  daily: { tokens: number; costUsd: number; requests: number };
  allTime: { tokens: number; costUsd: number; requests: number };
  topModels: Array<{ model: string; tokens: number; costUsd: number; requests: number }>;
}

export class AraCloudSDK {
  private baseUrl: string;
  private token: string | null = null;
  private apiKey: string | null = null;

  constructor(config: AraCloudConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token ?? null;
    this.apiKey = config.apiKey ?? null;
  }

  setToken(token: string) { this.token = token; }
  setApiKey(key: string) { this.apiKey = key; }
  clearAuth() { this.token = null; this.apiKey = null; }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    useApiKey = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (useApiKey && this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    } else if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json() as T & { error?: string };

    if (!response.ok) {
      throw new Error((data as { error?: string }).error ?? `HTTP ${response.status}`);
    }

    return data;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  async register(email: string, password: string, name: string, company?: string): Promise<{ token: string; client: AraCloudClient }> {
    const result = await this.request<{ token: string; client: AraCloudClient }>(
      "POST", "/api/auth/register", { email, password, name, company }
    );
    this.token = result.token;
    return result;
  }

  async login(email: string, password: string): Promise<{ token: string; client: AraCloudClient }> {
    const result = await this.request<{ token: string; client: AraCloudClient }>(
      "POST", "/api/auth/login", { email, password }
    );
    this.token = result.token;
    return result;
  }

  async logout(): Promise<void> {
    await this.request("POST", "/api/auth/logout");
    this.clearAuth();
  }

  async getMe(): Promise<AraCloudClient> {
    return this.request("GET", "/api/auth/me");
  }

  // ─── Key Provisioning ──────────────────────────────────────────────────────
  async provisionKey(label = "ARA Desktop"): Promise<ProvisionedKey> {
    return this.request("POST", "/api/clients/provision", { label });
  }

  async listKeys(): Promise<Array<{ id: string; keyPrefix: string; label: string; status: string; lastUsedAt: string | null }>> {
    return this.request("GET", "/api/clients/keys");
  }

  async rotateKey(keyId: string): Promise<ProvisionedKey> {
    return this.request("POST", `/api/clients/keys/${keyId}/rotate`);
  }

  async revokeKey(keyId: string): Promise<void> {
    await this.request("DELETE", `/api/clients/keys/${keyId}`);
  }

  // ─── LLM Proxy ────────────────────────────────────────────────────────────
  async chat(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    sessionId?: string;
    agentId?: string;
  }): Promise<unknown> {
    return this.request("POST", "/api/proxy/chat", params, true);
  }

  async getModels(): Promise<{ models: Array<{ id: string; free: boolean }>; tier: string }> {
    return this.request("GET", "/api/proxy/models", undefined, true);
  }

  // ─── Usage ────────────────────────────────────────────────────────────────
  async getUsageSummary(): Promise<UsageSummary> {
    return this.request("GET", "/api/usage/summary");
  }

  async getUsageChart(): Promise<Array<{ date: string; tokens: number; costUsd: number; requests: number }>> {
    return this.request("GET", "/api/usage/chart");
  }

  // ─── Billing ──────────────────────────────────────────────────────────────
  async getBillingStatus(): Promise<{ tier: string; subscription: unknown }> {
    return this.request("GET", "/api/billing/status");
  }

  async getBillingPortalUrl(): Promise<{ url: string }> {
    return this.request("POST", "/api/billing/portal");
  }

  async getInvoices(): Promise<unknown[]> {
    return this.request("GET", "/api/billing/invoices");
  }

  // ─── Health ───────────────────────────────────────────────────────────────
  async ping(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/health`);
      return true;
    } catch {
      return false;
    }
  }
}

// Default ARA Cloud instance — points to the official hosted backend
// Users can override this in settings to point to their own self-hosted instance
export const DEFAULT_ARA_CLOUD_URL = "https://cloud.ara-platform.app";

export function createAraCloudSDK(baseUrl?: string, token?: string, apiKey?: string): AraCloudSDK {
  return new AraCloudSDK({
    baseUrl: baseUrl ?? DEFAULT_ARA_CLOUD_URL,
    token,
    apiKey,
  });
}
