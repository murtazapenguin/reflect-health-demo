import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PhoneArrowDownLeftIcon,
  ClockIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { api } from '../api'

const INTENT_COLORS = { eligibility: '#fc459d', claims: '#7c5cf5', other: '#f59e0b', general: '#94a3b8', prior_auth: '#ef4444', unknown: '#94a3b8' }
const OUTCOME_COLORS = { resolved: '#34d399', transferred: '#f59e0b', failed: '#ef4444', not_found: '#94a3b8', auth_failed: '#ef4444', unknown: '#cbd5e1' }

const Dashboard = () => {
  const [kpis, setKpis] = useState(null)
  const [trend, setTrend] = useState([])
  const [recentCalls, setRecentCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [kpiData, trendData, callsData] = await Promise.all([
        api.getKPIs(),
        api.getKPITrend(30),
        api.getCalls({ page_size: 8 }),
      ])
      setKpis(kpiData)
      setTrend(trendData)
      setRecentCalls(callsData.items)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Deflection Rate',
      value: `${kpis?.deflection_rate || 0}%`,
      target: '65%',
      icon: PhoneArrowDownLeftIcon,
      good: (kpis?.deflection_rate || 0) >= 65,
    },
    {
      name: 'Avg Handle Time',
      value: `${Math.round(kpis?.avg_handle_time_seconds || 0)}s`,
      target: '<90s',
      icon: ClockIcon,
      good: (kpis?.avg_handle_time_seconds || 0) < 90,
    },
    {
      name: 'Transfer Rate',
      value: `${kpis?.transfer_rate || 0}%`,
      target: '<25%',
      icon: ArrowPathIcon,
      good: (kpis?.transfer_rate || 0) < 25,
    },
    {
      name: 'Auth Success',
      value: `${kpis?.auth_success_rate || 0}%`,
      target: '90%',
      icon: ShieldCheckIcon,
      good: (kpis?.auth_success_rate || 0) >= 90,
    },
  ]

  const intentData = Object.entries(kpis?.calls_by_intent || {}).map(([name, value]) => ({ name, value }))
  const outcomeData = Object.entries(kpis?.calls_by_outcome || {}).map(([name, value]) => ({ name, value }))

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="reflect-gradient rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="type-micro uppercase tracking-[0.15em] text-white/70 mb-1">Voice AI Command Center</p>
            <h2 className="text-2xl font-bold mb-1">Performance Overview</h2>
            <p className="text-white/60 text-sm">{kpis?.total_calls || 0} total calls processed &middot; Last 30 days</p>
          </div>
          <button onClick={loadData} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all" title="Refresh">
            <ArrowPathIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="metric-card flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className={`type-micro px-2 py-0.5 rounded-full ${stat.good ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                  Target: {stat.target}
                </span>
              </div>
              <p className="type-micro text-muted-foreground mt-1">{stat.name}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 metric-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Call Volume Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 93%)" />
              <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip labelFormatter={(v) => formatDate(v)} />
              <Line type="monotone" dataKey="total_calls" stroke="#fc459d" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="resolved" stroke="#34d399" strokeWidth={2} dot={false} name="Resolved" />
              <Line type="monotone" dataKey="transferred" stroke="#f59e0b" strokeWidth={2} dot={false} name="Transferred" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="metric-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Call Breakdown</h3>
          <div className="mb-4">
            <p className="type-micro uppercase tracking-[0.15em] text-muted-foreground mb-2">By Intent</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={intentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                  {intentData.map((entry) => (
                    <Cell key={entry.name} fill={INTENT_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="type-micro uppercase tracking-[0.15em] text-muted-foreground mb-2">By Outcome</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                  {outcomeData.map((entry) => (
                    <Cell key={entry.name} fill={OUTCOME_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="metric-card !p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Recent Calls</h3>
            <p className="type-micro text-muted-foreground">Latest call activity</p>
          </div>
          <button onClick={() => navigate('/calls')} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            View all &rarr;
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-4 py-2.5 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Time</th>
                <th className="px-4 py-2.5 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Provider</th>
                <th className="px-4 py-2.5 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Patient</th>
                <th className="px-4 py-2.5 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Intent</th>
                <th className="px-4 py-2.5 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Outcome</th>
                <th className="px-4 py-2.5 text-left type-micro uppercase tracking-[0.1em] text-muted-foreground">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentCalls.map((call) => (
                <tr key={call.call_id} onClick={() => navigate(`/calls/${call.call_id}`)}
                  className="hover:bg-primary/3 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatTime(call.started_at)}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
