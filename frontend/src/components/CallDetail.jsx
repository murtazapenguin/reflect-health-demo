import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  FlagIcon,
  PhoneIcon,
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { FlagIcon as FlagIconSolid } from '@heroicons/react/24/solid'
import { api } from '../api'

const CallDetail = () => {
  const { callId } = useParams()
  const navigate = useNavigate()
  const [call, setCall] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    loadCall()
  }, [callId])

  const loadCall = async () => {
    try {
      const data = await api.getCallDetail(callId)
      setCall(data)
    } catch (err) {
      console.error('Failed to load call:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFlag = async () => {
    if (!call) return
    try {
      const updated = await api.updateCallFlag(callId, !call.flagged)
      setCall(updated)
    } catch (err) {
      console.error('Failed to toggle flag:', err)
    }
  }

  const handleAddTag = async () => {
    if (!call || !newTag.trim()) return
    const tags = [...new Set([...call.tags, newTag.trim().toLowerCase()])]
    try {
      const updated = await api.updateCallTags(callId, tags)
      setCall(updated)
      setNewTag('')
    } catch (err) {
      console.error('Failed to add tag:', err)
    }
  }

  const handleRemoveTag = async (tag) => {
    if (!call) return
    const tags = call.tags.filter(t => t !== tag)
    try {
      const updated = await api.updateCallTags(callId, tags)
      setCall(updated)
    } catch (err) {
      console.error('Failed to remove tag:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!call) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Call not found</p>
        <button onClick={() => navigate('/calls')} className="mt-2 text-primary hover:text-primary/80 text-sm font-medium">
          Back to Call Log
        </button>
      </div>
    )
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/calls')}
          className="p-2 rounded-lg border border-border bg-card hover:border-primary/30 transition-all">
          <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">
            {call.intent === 'eligibility' ? 'Eligibility Check' :
             call.intent === 'claims' ? 'Claims Inquiry' :
             call.intent === 'prior_auth' ? 'Prior Auth Request' :
             'Inbound Call'}
            {call.provider_name ? ` — ${call.provider_name}` : ''}
          </h2>
          <p className="type-micro text-muted-foreground">
            {formatDateTime(call.started_at)}
            {call.patient_name ? ` · Patient: ${call.patient_name}` : ''}
          </p>
        </div>
        <button onClick={handleToggleFlag}
          className={`p-2 rounded-lg border transition-all ${call.flagged ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'text-muted-foreground border-border bg-card hover:border-primary/30 hover:text-red-500'}`}
          title={call.flagged ? 'Unflag' : 'Flag for review'}>
          {call.flagged ? <FlagIconSolid className="w-5 h-5" /> : <FlagIcon className="w-5 h-5" />}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="metric-card flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-muted-foreground" />
            <span className="type-micro text-muted-foreground uppercase">Duration</span>
          </div>
          <p className="text-xl font-bold text-foreground">{call.duration_seconds}s</p>
        </div>
        <div className="metric-card flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
            <span className="type-micro text-muted-foreground uppercase">Intent</span>
          </div>
          <span className={`inline-flex w-fit px-2 py-0.5 text-xs font-semibold rounded-full ${
            call.intent === 'eligibility' ? 'bg-brand-50 text-brand-600' :
            call.intent === 'claims' ? 'bg-violet-50 text-violet-600' :
            'bg-secondary text-muted-foreground'
          }`}>{call.intent || 'unknown'}</span>
        </div>
        <div className="metric-card flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
            <span className="type-micro text-muted-foreground uppercase">Outcome</span>
          </div>
          <span className={`inline-flex w-fit px-2 py-0.5 text-xs font-semibold rounded-full ${
            call.outcome === 'resolved' ? 'bg-emerald-50 text-emerald-600' :
            call.outcome === 'transferred' ? 'bg-amber-50 text-amber-600' :
            'bg-red-50 text-red-600'
          }`}>{call.outcome}</span>
        </div>
        <div className="metric-card flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4 text-muted-foreground" />
            <span className="type-micro text-muted-foreground uppercase">Auth</span>
          </div>
          <span className={`inline-flex w-fit px-2 py-0.5 text-xs font-semibold rounded-full ${
            call.auth_success ? 'bg-emerald-50 text-emerald-600' : call.auth_success === false ? 'bg-red-50 text-red-600' : 'bg-secondary text-muted-foreground'
          }`}>{call.auth_success ? 'Success' : call.auth_success === false ? 'Failed' : 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="metric-card !p-0 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Transcript</h3>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto space-y-3">
              {call.transcript.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No transcript available</p>
              ) : call.transcript.map((entry, idx) => (
                <div key={idx} className={`flex ${entry.speaker === 'AI' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                    entry.speaker === 'AI'
                      ? 'bg-primary/5 border border-primary/15'
                      : 'bg-secondary border border-border'
                  }`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      entry.speaker === 'AI' ? 'reflect-gradient-text' : 'text-muted-foreground'
                    }`}>{entry.speaker}</p>
                    <p className="text-sm text-foreground leading-relaxed">{entry.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {call.recording_url && (
            <div className="metric-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Recording</h3>
              <audio controls className="w-full" src={call.recording_url}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="metric-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Call Info</h3>
            <dl className="space-y-2.5">
              {[
                ['Provider', call.provider_name],
                ['NPI', call.provider_npi],
                ['Patient', call.patient_name],
                ['DOB', call.patient_dob],
                ['From', call.phone_from],
                ['To', call.phone_to],
                ['Started', formatDateTime(call.started_at)],
                ['Ended', formatDateTime(call.ended_at)],
              ].map(([label, value]) => value ? (
                <div key={label} className="flex justify-between">
                  <dt className="type-micro text-muted-foreground">{label}</dt>
                  <dd className="text-xs font-medium text-foreground text-right">{value}</dd>
                </div>
              ) : null)}
            </dl>
          </div>

          {Object.keys(call.extracted_data).length > 0 && (
            <div className="metric-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Extracted Data</h3>
              <dl className="space-y-2">
                {Object.entries(call.extracted_data).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <dt className="type-micro text-muted-foreground">{key}</dt>
                    <dd className="text-xs font-medium text-foreground text-right max-w-[60%] truncate" title={String(value)}>
                      {String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="metric-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {call.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/8 text-primary border border-primary/20">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add tag..." className="flex-1 px-2.5 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all" />
              <button onClick={handleAddTag}
                className="p-1.5 bg-primary/8 text-primary hover:bg-primary/15 rounded-lg transition-all">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {call.transferred && (
            <div className="metric-card !border-amber-200 !bg-amber-50/50">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">Transfer Context</h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                Call was transferred to a human agent.
                {call.provider_name && ` Provider: ${call.provider_name}.`}
                {call.intent && ` Original intent: ${call.intent}.`}
                {call.auth_success && ' Provider was authenticated.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CallDetail
