const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('authToken')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: getHeaders(),
    ...options,
  })
  if (res.status === 401) {
    localStorage.removeItem('authToken')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error?.message || data?.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request('/auth/me'),

  getCalls: (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') qs.set(k, v)
    })
    return request(`/dashboard/calls?${qs}`)
  },

  getCallDetail: (callId) => request(`/dashboard/calls/${callId}`),

  getKPIs: () => request('/dashboard/kpis'),

  getKPITrend: (days = 30) => request(`/dashboard/kpis/trend?days=${days}`),

  updateCallTags: (callId, tags) =>
    request(`/dashboard/calls/${callId}/tags`, {
      method: 'PATCH',
      body: JSON.stringify({ tags }),
    }),

  updateCallFlag: (callId, flagged) =>
    request(`/dashboard/calls/${callId}/flag`, {
      method: 'PATCH',
      body: JSON.stringify({ flagged }),
    }),
}
