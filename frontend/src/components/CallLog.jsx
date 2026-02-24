import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlassIcon, FunnelIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { api } from '../api'

const CallLog = () => {
  const [calls, setCalls] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [intentFilter, setIntentFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const loadCalls = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getCalls({ page, page_size: pageSize, search: search || undefined, intent: intentFilter || undefined, outcome: outcomeFilter || undefined })
      setCalls(data.items)
      setTotal(data.total)
    } catch (err) {
      console.error('Failed to load calls:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, intentFilter, outcomeFilter])

  useEffect(() => { loadCalls() }, [loadCalls])
  useEffect(() => { setPage(1) }, [search, intentFilter, outcomeFilter])

  const totalPages = Math.ceil(total / pageSize)

  const formatTime = (dateStr) => new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search provider, patient, or call ID..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-card border border-border rounded-xl placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-muted-foreground" />
          <select value={intentFilter} onChange={(e) => setIntentFilter(e.target.value)}
            className="text-sm bg-card border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:border-primary transition-all">
            <option value="">All Intents</option>
            <option value="eligibility">Eligibility</option>
            <option value="claims">Claims</option>
            <option value="general">General</option>
          </select>
          <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)}
            className="text-sm bg-card border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:border-primary transition-all">
            <option value="">All Outcomes</option>
            <option value="resolved">Resolved</option>
            <option value="transferred">Transferred</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="metric-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Call ID</th>
                <th className="px-4 py-3 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Provider</th>
                <th className="px-4 py-3 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Patient</th>
                <th className="px-4 py-3 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Intent</th>
                <th className="px-4 py-3 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Outcome</th>
                <th className="px-4 py-3 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Duration</th>
                <th className="px-4 py-3 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
                </td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">No calls found</td></tr>
              ) : calls.map((call) => (
                <tr key={call.call_id} onClick={() => navigate(`/calls/${call.call_id}`)}
                  className="hover:bg-primary/3 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatTime(call.started_at)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{call.call_id?.substring(0, 12)}...</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{call.provider_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{call.patient_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      call.intent === 'eligibility' ? 'bg-brand-50 text-brand-600' :
                      call.intent === 'claims' ? 'bg-violet-50 text-violet-600' :
                      'bg-secondary text-muted-foreground'
                    }`}>{call.intent || 'unknown'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      call.outcome === 'resolved' ? 'bg-emerald-50 text-emerald-600' :
                      call.outcome === 'transferred' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>{call.outcome}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{call.duration_seconds}s</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(call.tags || []).slice(0, 2).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-secondary text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/30 disabled:opacity-40 transition-all">
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-foreground px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/30 disabled:opacity-40 transition-all">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CallLog
