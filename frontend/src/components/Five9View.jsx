import { useState, useEffect } from 'react'
import {
  CpuChipIcon,
  UserGroupIcon,
  PhoneArrowUpRightIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, Cell,
} from 'recharts'
import { api } from '../api'

const DISPOSITION_MAP = {
  'eligibility|resolved': { code: 'AI_RESOLVED_ELIG', label: 'AI Resolved — Eligibility', color: 'emerald' },
  'claims|resolved': { code: 'AI_RESOLVED_CLAIMS', label: 'AI Resolved — Claims', color: 'emerald' },
  'eligibility|transferred': { code: 'AI_TRANSFER_ELIG', label: 'Transfer — Eligibility', color: 'amber' },
  'claims|transferred': { code: 'AI_TRANSFER_CLAIMS', label: 'Transfer — Claims', color: 'amber' },
  'prior_auth|resolved': { code: 'AI_RESOLVED_PA', label: 'AI Resolved — Prior Auth', color: 'emerald' },
  'prior_auth|transferred': { code: 'AI_TRANSFER_PA', label: 'Transfer — Prior Auth', color: 'amber' },
  'other|transferred': { code: 'AI_TRANSFER_OTHER', label: 'Transfer — Other / Out of Scope', color: 'amber' },
  'other|resolved': { code: 'AI_RESOLVED_OTHER', label: 'AI Resolved — Other', color: 'emerald' },
  '_|failed': { code: 'AI_FAILED', label: 'AI Failed', color: 'red' },
  '_|auth_failed': { code: 'AI_AUTH_FAILED', label: 'Auth Failed', color: 'red' },
}

function getDisposition(intent, outcome) {
  const key = `${intent || 'other'}|${outcome}`
  if (DISPOSITION_MAP[key]) return DISPOSITION_MAP[key]
  const fallback = `_|${outcome}`
  if (DISPOSITION_MAP[fallback]) return DISPOSITION_MAP[fallback]
  return { code: 'UNKNOWN', label: outcome || 'Unknown', color: 'slate' }
}

const FIVE9_BLUE = '#1a56db'
const FIVE9_NAVY = '#1e3a5f'
const HUMAN_BENCHMARK_AHT = 270

const Five9View = () => {
  const [kpis, setKpis] = useState(null)
  const [trend, setTrend] = useState([])
  const [allCalls, setAllCalls] = useState([])
  const [transferredCalls, setTransferredCalls] = useState([])
  const [selectedCall, setSelectedCall] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [kpiData, trendData, callsData, txCalls] = await Promise.all([
        api.getKPIs(),
        api.getKPITrend(30),
        api.getCalls({ page_size: 200 }),
        api.getCalls({ outcome: 'transferred', page_size: 20 }),
      ])
      setKpis(kpiData)
      setTrend(trendData)
      setAllCalls(callsData.items || [])
      setTransferredCalls(txCalls.items || [])
      if (txCalls.items?.length > 0) {
        const first = txCalls.items[0]
        setSelectedCall(first.call_id)
        loadCallDetail(first.call_id)
      }
    } catch (err) {
      console.error('Failed to load Five9 data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCallDetail = async (callId) => {
    try {
      const detail = await api.getCallDetail(callId)
      setSelectedDetail(detail)
    } catch (err) {
      console.error('Failed to load call detail:', err)
    }
  }

  const handleCallSelect = (callId) => {
    setSelectedCall(callId)
    loadCallDetail(callId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  const totalCalls = kpis?.total_calls || 0
  const resolvedCount = Math.round(totalCalls * (kpis?.deflection_rate || 0) / 100)
  const transferredCount = Math.round(totalCalls * (kpis?.transfer_rate || 0) / 100)
  const aiAHT = Math.round(kpis?.avg_handle_time_seconds || 0)

  const dispositionCounts = {}
  ;(allCalls || []).forEach((c) => {
    const d = getDisposition(c.intent, c.outcome)
    dispositionCounts[d.code] = dispositionCounts[d.code] || { ...d, count: 0 }
    dispositionCounts[d.code].count++
  })
  const dispositionRows = Object.values(dispositionCounts).sort((a, b) => b.count - a.count)

  const ahtComparison = [
    { name: 'AI Agent', seconds: aiAHT, fill: FIVE9_BLUE },
    { name: 'Human Agent (Benchmark)', seconds: HUMAN_BENCHMARK_AHT, fill: '#94a3b8' },
  ]

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${FIVE9_NAVY}, ${FIVE9_BLUE})` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="type-micro uppercase tracking-[0.15em] text-white/70 mb-1">Contact Center Integration</p>
            <h2 className="text-2xl font-bold mb-1">Five9 Integration View</h2>
            <p className="text-white/60 text-sm">Showing how AI call data flows into your Five9 environment</p>
          </div>
          <button onClick={loadData} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all" title="Refresh">
            <ArrowPathIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Section 1: Real-Time Queue Monitor */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <SignalIcon className="w-4 h-4 text-blue-600" />
          Real-Time Queue Monitor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AI Virtual Agent */}
          <div className="metric-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5" style={{ background: FIVE9_BLUE, transform: 'translate(30%, -30%)' }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${FIVE9_BLUE}14` }}>
                  <CpuChipIcon className="w-5 h-5" style={{ color: FIVE9_BLUE }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">AI Virtual Agent</p>
                  <p className="type-micro text-muted-foreground">Reflect Health IVA</p>
                </div>
              </div>
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" style={{ animation: 'status-pulse 2s ease-in-out infinite' }} />
                Available
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="type-micro text-muted-foreground">Handled Today</p>
                <p className="text-xl font-bold text-foreground">{resolvedCount}</p>
              </div>
              <div>
                <p className="type-micro text-muted-foreground">Avg Handle Time</p>
                <p className="text-xl font-bold text-foreground">{aiAHT}s</p>
              </div>
              <div>
                <p className="type-micro text-muted-foreground">Deflection Rate</p>
                <p className="text-xl font-bold text-emerald-600">{kpis?.deflection_rate || 0}%</p>
              </div>
              <div>
                <p className="type-micro text-muted-foreground">Auth Success</p>
                <p className="text-xl font-bold text-foreground">{kpis?.auth_success_rate || 0}%</p>
              </div>
            </div>
          </div>

          {/* Transfer Queue */}
          <div className="metric-card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-5 bg-amber-500" style={{ transform: 'translate(30%, -30%)' }} />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
                  <UserGroupIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Human Agent Queue</p>
                  <p className="type-micro text-muted-foreground">Transfers from AI</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="type-micro text-muted-foreground">Transferred</p>
                <p className="text-xl font-bold text-amber-600">{transferredCount}</p>
              </div>
              <div>
                <p className="type-micro text-muted-foreground">Transfer Rate</p>
                <p className="text-xl font-bold text-foreground">{kpis?.transfer_rate || 0}%</p>
              </div>
              <div>
                <p className="type-micro text-muted-foreground">Est. Wait Time</p>
                <p className="text-xl font-bold text-foreground">~2 min</p>
              </div>
              <div>
                <p className="type-micro text-muted-foreground">Queue Depth</p>
                <p className="text-xl font-bold text-foreground">{Math.min(transferredCount, 3)}</p>
              </div>
            </div>
          </div>

          {/* Service Level */}
          <div className="metric-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${FIVE9_BLUE}14` }}>
                <PhoneArrowUpRightIcon className="w-5 h-5" style={{ color: FIVE9_BLUE }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Service Level</p>
                <p className="type-micro text-muted-foreground">AI vs Human Distribution</p>
              </div>
            </div>
            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="type-micro text-muted-foreground">AI Resolved</span>
                  <span className="text-sm font-bold text-emerald-600">{kpis?.deflection_rate || 0}%</span>
                </div>
                <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${kpis?.deflection_rate || 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="type-micro text-muted-foreground">Transferred to Agent</span>
                  <span className="text-sm font-bold text-amber-600">{kpis?.transfer_rate || 0}%</span>
                </div>
                <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500 transition-all duration-1000" style={{ width: `${kpis?.transfer_rate || 0}%` }} />
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="type-micro text-muted-foreground">Total Calls</span>
                  <span className="text-lg font-bold text-foreground">{totalCalls}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Agent Desktop Screen Pop */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 text-blue-600" />
          Agent Desktop — Screen Pop Preview
        </h3>
        <div className="metric-card !p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between" style={{ background: `${FIVE9_BLUE}08` }}>
            <div>
              <p className="text-sm font-semibold text-foreground">Incoming Transfer from AI Agent</p>
              <p className="type-micro text-muted-foreground">What the Five9 agent sees when a call is transferred</p>
            </div>
            {transferredCalls.length > 0 && (
              <div className="relative">
                <select
                  value={selectedCall || ''}
                  onChange={(e) => handleCallSelect(e.target.value)}
                  className="appearance-none bg-white border border-border rounded-lg px-3 py-1.5 pr-8 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {transferredCalls.map((c) => (
                    <option key={c.call_id} value={c.call_id}>
                      {formatTime(c.started_at)} — {c.provider_name || 'Unknown'}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="w-4 h-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>

          {selectedDetail ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Caller Context */}
              <div className="p-5 lg:col-span-2">
                <p className="type-micro uppercase tracking-[0.15em] text-blue-600 mb-3">Caller Context</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="type-micro text-muted-foreground">Provider</p>
                    <p className="text-sm font-semibold text-foreground">{selectedDetail.provider_name || '—'}</p>
                  </div>
                  <div>
                    <p className="type-micro text-muted-foreground">NPI</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{selectedDetail.provider_npi || '—'}</p>
                  </div>
                  <div>
                    <p className="type-micro text-muted-foreground">Patient</p>
                    <p className="text-sm font-semibold text-foreground">{selectedDetail.patient_name || '—'}</p>
                  </div>
                  <div>
                    <p className="type-micro text-muted-foreground">DOB</p>
                    <p className="text-sm font-semibold text-foreground">{selectedDetail.patient_dob || '—'}</p>
                  </div>
                  <div>
                    <p className="type-micro text-muted-foreground">Intent</p>
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      selectedDetail.intent === 'eligibility' ? 'bg-blue-50 text-blue-700' :
                      selectedDetail.intent === 'claims' ? 'bg-violet-50 text-violet-700' :
                      'bg-secondary text-muted-foreground'
                    }`}>{selectedDetail.intent || 'unknown'}</span>
                  </div>
                  <div>
                    <p className="type-micro text-muted-foreground">Auth Verified</p>
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      selectedDetail.auth_success ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {selectedDetail.auth_success ? (
                        <><CheckCircleIcon className="w-4 h-4" /> Yes</>
                      ) : (
                        <><ExclamationTriangleIcon className="w-4 h-4" /> No</>
                      )}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="type-micro text-muted-foreground">Call Duration Before Transfer</p>
                    <p className="text-sm font-semibold text-foreground">{selectedDetail.duration_seconds}s</p>
                  </div>
                </div>

                {selectedDetail.transcript?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="type-micro uppercase tracking-[0.15em] text-blue-600 mb-2">Conversation Summary</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                      {selectedDetail.transcript.slice(-4).map((t, i) => (
                        <div key={i} className="flex gap-2">
                          <span className={`type-micro font-bold shrink-0 w-14 ${
                            t.speaker === 'AI' ? 'text-blue-600' : 'text-foreground'
                          }`}>{t.speaker}</span>
                          <span className="text-xs text-muted-foreground leading-relaxed">{t.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Disposition Panel */}
              <div className="p-5">
                <p className="type-micro uppercase tracking-[0.15em] text-blue-600 mb-3">Suggested Disposition</p>
                {(() => {
                  const d = getDisposition(selectedDetail.intent, selectedDetail.outcome)
                  return (
                    <div className="space-y-4">
                      <div className={`px-3 py-2.5 rounded-xl border-2 ${
                        d.color === 'emerald' ? 'border-emerald-200 bg-emerald-50' :
                        d.color === 'amber' ? 'border-amber-200 bg-amber-50' :
                        d.color === 'red' ? 'border-red-200 bg-red-50' :
                        'border-border bg-secondary'
                      }`}>
                        <p className="type-micro text-muted-foreground">Disposition Code</p>
                        <p className="text-sm font-bold font-mono text-foreground mt-0.5">{d.code}</p>
                        <p className="type-micro text-muted-foreground mt-1">{d.label}</p>
                      </div>

                      <div>
                        <p className="type-micro text-muted-foreground mb-1.5">Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {(selectedDetail.tags || []).map((tag) => (
                            <span key={tag} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-50 text-blue-700">{tag}</span>
                          ))}
                          {(!selectedDetail.tags || selectedDetail.tags.length === 0) && (
                            <span className="text-xs text-muted-foreground">No tags</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="type-micro text-muted-foreground mb-1.5">Transfer Reason</p>
                        <p className="text-xs text-foreground leading-relaxed">
                          {selectedDetail.intent === 'other'
                            ? 'Request outside AI scope (e.g., prior auth, billing dispute)'
                            : selectedDetail.auth_success === false
                              ? 'Provider authentication failed after retries'
                              : 'AI could not fully resolve — escalated to human agent'}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No transferred calls to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Disposition Analytics */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-blue-600" />
          Disposition Analytics
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Disposition Table */}
          <div className="metric-card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Disposition Breakdown</p>
              <p className="type-micro text-muted-foreground">Five9 disposition code mapping</p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-secondary/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Code</th>
                    <th className="px-3 py-2 text-right type-micro uppercase tracking-[0.1em] text-muted-foreground">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dispositionRows.map((row) => (
                    <tr key={row.code} className="hover:bg-secondary/30">
                      <td className="px-3 py-2">
                        <p className="text-xs font-mono font-semibold text-foreground">{row.code}</p>
                        <p className="type-micro text-muted-foreground">{row.label}</p>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`inline-flex min-w-[28px] justify-center px-2 py-0.5 text-xs font-bold rounded-full ${
                          row.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                          row.color === 'amber' ? 'bg-amber-50 text-amber-700' :
                          row.color === 'red' ? 'bg-red-50 text-red-700' :
                          'bg-secondary text-muted-foreground'
                        }`}>{row.count}</span>
                      </td>
                    </tr>
                  ))}
                  {dispositionRows.length === 0 && (
                    <tr><td colSpan={2} className="px-3 py-4 text-center text-sm text-muted-foreground">No data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AHT Comparison */}
          <div className="metric-card">
            <p className="text-sm font-semibold text-foreground mb-1">Handle Time Comparison</p>
            <p className="type-micro text-muted-foreground mb-4">AI Agent vs Human Agent (industry avg)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ahtComparison} layout="vertical" barSize={28}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(240 10% 93%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" unit="s" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#94a3b8" width={130} />
                <Tooltip formatter={(val) => `${val}s`} />
                <Bar dataKey="seconds" radius={[0, 6, 6, 0]}>
                  {ahtComparison.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 pt-3 border-t border-border text-center">
              <p className="type-micro text-muted-foreground">AI is</p>
              <p className="text-lg font-bold" style={{ color: FIVE9_BLUE }}>
                {HUMAN_BENCHMARK_AHT > 0 ? Math.round((1 - aiAHT / HUMAN_BENCHMARK_AHT) * 100) : 0}% faster
              </p>
              <p className="type-micro text-muted-foreground">than human agents</p>
            </div>
          </div>

          {/* Daily Volume by Channel */}
          <div className="metric-card">
            <p className="text-sm font-semibold text-foreground mb-1">Daily Volume by Channel</p>
            <p className="type-micro text-muted-foreground mb-4">AI-resolved vs transferred to agent</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 93%)" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip labelFormatter={formatDate} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="resolved" stackId="1" stroke="#34d399" fill="#34d399" fillOpacity={0.4} name="AI Resolved" />
                <Area type="monotone" dataKey="transferred" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Transferred to Agent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Five9View
