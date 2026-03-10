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
  transfer_reason: string | null;
  source: string;
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
  accuracy_scores: Record<string, unknown>;
}

export interface QAReview {
  id: string;
  call_id: string;
  reviewer: string;
  review_score: number;
  categories: Record<string, number>;
  notes: string;
  status: string;
  reviewed_at: string;
}

export interface QAReviewInput {
  reviewer: string;
  review_score: number;
  categories: Record<string, number>;
  notes: string;
  status: string;
}

export interface AccuracyKPIs {
  avg_auto_score: number;
  avg_human_score: number | null;
  score_distribution: Record<string, number>;
  accuracy_by_intent: Record<string, number>;
  total_scored: number;
  total_reviewed: number;
  needs_review: number;
  recent_reviews: QAReview[];
  category_averages: Record<string, number>;
}

export interface CallerContextMember {
  member_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  plan_name: string;
  status: string;
  effective_date: string;
  term_date: string | null;
  copay_primary: number | null;
  copay_specialist: number | null;
  deductible: number | null;
  deductible_met: number | null;
  out_of_pocket_max: number | null;
  out_of_pocket_met: number | null;
}

export interface CallerContextClaim {
  claim_number: string;
  status: string;
  date_of_service: string;
  procedure_desc: string;
  billed_amount: number | null;
  paid_amount: number | null;
  denial_reason: string | null;
}

export interface CallerContextPriorAuth {
  pa_id: string;
  status: string;
  service_description: string;
  submitted_date: string;
  decision_date: string | null;
}

export interface CallerContext {
  found: boolean;
  message?: string;
  member?: CallerContextMember;
  claims?: CallerContextClaim[];
  prior_auths?: CallerContextPriorAuth[];
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

  submitQAReview: (callId: string, data: QAReviewInput) =>
    request<QAReview>(`/dashboard/calls/${callId}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getCallReviews: (callId: string) =>
    request<QAReview[]>(`/dashboard/calls/${callId}/reviews`),

  getAccuracyKPIs: () => request<AccuracyKPIs>("/dashboard/kpis/accuracy"),

  registerSession: (conversationId: string) =>
    request<{ status: string; conversation_id: string }>("/voice/session/start", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId }),
    }),

  endSession: (conversationId: string) =>
    request<{ status: string }>("/voice/session/end", {
      method: "POST",
      body: JSON.stringify({ conversation_id: conversationId }),
    }),

  getCallerContext: (memberId: string) =>
    request<CallerContext>(`/voice/caller-context/${encodeURIComponent(memberId)}`, {
      headers: { ...getHeaders(), "X-Internal-Token": import.meta.env.VITE_INTERNAL_API_TOKEN || "reflect-internal-token-2026" },
    }),

  getElevenLabsSignedUrl: () => request<{ signed_url: string }>("/elevenlabs/token"),
  getElevenLabsConfig: () => request<{ agent_id: string }>("/elevenlabs/config"),

  saveElevenLabsConversation: (data: {
    conversation_id: string | null;
    transcript: { speaker: string; text: string }[];
    duration_seconds: number;
  }) => request<{ call_id: string; status: string }>("/elevenlabs/save-conversation", {
    method: "POST",
    body: JSON.stringify(data),
  }),
};
