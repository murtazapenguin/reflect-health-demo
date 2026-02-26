const API_BASE = import.meta.env.VITE_API_BASE || "/api/v1";

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = localStorage.getItem("authToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(),
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || data?.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface KPIs {
  total_calls: number;
  deflection_rate: number;
  avg_handle_time_seconds: number;
  transfer_rate: number;
  auth_success_rate: number;
  calls_by_intent: Record<string, number>;
  calls_by_outcome: Record<string, number>;
}

export interface KPITrendPoint {
  date: string;
  total_calls: number;
  resolved: number;
  transferred: number;
}

export interface CallSummary {
  call_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  provider_name: string;
  provider_npi: string;
  patient_name: string;
  patient_dob: string;
  phone_from: string;
  phone_to: string;
  intent: string;
  outcome: string;
  auth_success: boolean | null;
  transferred: boolean;
  tags: string[];
  flagged: boolean;
}

export interface TranscriptEntry {
  speaker: string;
  text: string;
}

export interface CallDetail extends CallSummary {
  transcript: TranscriptEntry[];
  recording_url: string | null;
  extracted_data: Record<string, unknown>;
}

export interface CallsPage {
  items: CallSummary[];
  total: number;
}

export interface LoginResponse {
  access_token: string;
  user: { display_name: string; roles: string[] };
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request<{ display_name: string; roles: string[] }>("/auth/me"),

  getCalls: (params: Record<string, string | number | null | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") qs.set(k, String(v));
    });
    return request<CallsPage>(`/dashboard/calls?${qs}`);
  },

  getCallDetail: (callId: string) => request<CallDetail>(`/dashboard/calls/${callId}`),

  getKPIs: () => request<KPIs>("/dashboard/kpis"),

  getKPITrend: (days = 30) => request<KPITrendPoint[]>(`/dashboard/kpis/trend?days=${days}`),

  updateCallTags: (callId: string, tags: string[]) =>
    request(`/dashboard/calls/${callId}/tags`, {
      method: "PATCH",
      body: JSON.stringify({ tags }),
    }),

  updateCallFlag: (callId: string, flagged: boolean) =>
    request(`/dashboard/calls/${callId}/flag`, {
      method: "PATCH",
      body: JSON.stringify({ flagged }),
    }),

  getElevenLabsSignedUrl: () => request<{ signed_url: string }>("/elevenlabs/token"),
  getElevenLabsConfig: () => request<{ agent_id: string }>("/elevenlabs/config"),
};
