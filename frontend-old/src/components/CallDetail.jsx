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
            call.intent === 'prior_auth' ? 'bg-orange-50 text-orange-600' :
            'bg-secondary text-muted-foreground'
          }`}>{call.intent === 'prior_auth' ? 'prior auth' : call.intent || 'unknown'}</span>
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

          {Object.keys(call.extracted_data).length > 0 && (() => {
            const data = call.extracted_data
            const lookupFailed = data.found === 'false' || data.found === false
            const hasMessage = !!data.message
            const LABEL_MAP = {
              call_intent: 'Intent',
              npi: 'NPI',
              zip_code: 'Zip Code',
              provider_name: 'Provider',
              patient_name: 'Patient',
              patient_dob: 'DOB',
              claim_number: 'Claim #',
              valid: 'NPI Valid',
              verified: 'Zip Verified',
              found: 'Lookup Result',
              message: 'Details',
              service_type: 'Service',
              service_covered: 'Covered',
              service_copay: 'Service Copay',
              service_coinsurance: 'Coinsurance',
              service_prior_auth: 'Prior Auth Required',
              service_visit_limit: 'Visit Limit',
              service_notes: 'Service Notes',
              plan_name: 'Plan',
              status: 'Member Status',
              member_id: 'Member ID',
              effective_date: 'Effective Date',
              term_date: 'Term Date',
              copay_primary: 'Primary Copay',
              copay_specialist: 'Specialist Copay',
              deductible: 'Deductible',
              deductible_met: 'Deductible Met',
              cob_status: 'COB Status',
              out_of_pocket_max: 'OOP Max',
              out_of_pocket_met: 'OOP Met',
              pa_id: 'PA Request ID',
              pa_status: 'PA Status',
              service_description: 'Service',
              procedure_code: 'CPT Code',
              urgency: 'Urgency',
              submitted_date: 'Submitted',
              decision_date: 'Decision Date',
              expiration_date: 'Expires',
              approved_units: 'Approved Units',
              denial_reason: 'Denial Reason',
              notes: 'Notes',
            }
            const BOOL_KEYS = new Set(['found', 'valid', 'verified', 'service_covered', 'service_prior_auth'])
            const DOLLAR_KEYS = new Set(['service_copay', 'copay_primary', 'copay_specialist', 'deductible', 'deductible_met', 'out_of_pocket_max', 'out_of_pocket_met'])
            const PA_STATUS_MAP = { approved: 'Approved', denied: 'Denied', pending_review: 'Pending Review', in_review: 'In Review', expired: 'Expired' }
            const formatValue = (key, val) => {
              const s = String(val)
              if (key === 'found') return s === 'true' ? 'Found' : 'Not Found'
              if (key === 'valid' || key === 'verified') return s === 'true' ? 'Yes' : 'No'
              if (key === 'service_covered') return s === 'true' ? 'Yes' : s === 'false' ? 'No' : 'Unknown'
              if (key === 'service_prior_auth') return s === 'true' ? 'Yes' : 'No'
              if (key === 'service_coinsurance' && val != null) return `${val}%`
              if (DOLLAR_KEYS.has(key) && val != null) return `$${val}`
              if (key === 'pa_status') return PA_STATUS_MAP[s] || s
              if (key === 'urgency') return s === 'urgent' ? 'Urgent' : 'Routine'
              return s
            }
            return (
              <div className="metric-card">
                <h3 className="text-sm font-semibold text-foreground mb-3">Extracted Data</h3>
                {lookupFailed && (
                  <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">
                      {data.claim_number ? 'Claim Not Found' :
                       data.patient_name ? 'Patient Not Found' : 'Lookup Failed'}
                    </p>
                    {hasMessage && (
                      <p className="text-[11px] text-amber-700 leading-relaxed">{data.message}</p>
                    )}
                    {!hasMessage && data.patient_name && (
                      <p className="text-[11px] text-amber-700 leading-relaxed">
                        No match for "{data.patient_name}"{data.patient_dob ? ` (DOB: ${data.patient_dob})` : ''}.
                        The name may have been misheard by voice recognition.
                      </p>
                    )}
                  </div>
                )}
                <dl className="space-y-2">
                  {Object.entries(data)
                    .filter(([key]) => key !== 'message')
                    .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <dt className="type-micro text-muted-foreground">{LABEL_MAP[key] || key}</dt>
                      <dd className={`text-xs font-medium text-right max-w-[60%] truncate ${
                        key === 'found' ? (String(value) === 'true' ? 'text-emerald-600' : 'text-amber-600') :
                        key === 'service_covered' ? (String(value) === 'true' ? 'text-emerald-600' : String(value) === 'false' ? 'text-red-600' : 'text-amber-600') :
                        (key === 'valid' || key === 'verified') ? (String(value) === 'true' ? 'text-emerald-600' : 'text-red-600') :
                        key === 'service_prior_auth' ? (String(value) === 'true' ? 'text-amber-600' : 'text-emerald-600') :
                        key === 'pa_status' ? (String(value) === 'approved' ? 'text-emerald-600' : String(value) === 'denied' ? 'text-red-600' : String(value) === 'expired' ? 'text-muted-foreground' : 'text-amber-600') :
                        key === 'urgency' ? (String(value) === 'urgent' ? 'text-red-600' : 'text-foreground') :
                        'text-foreground'
                      }`} title={String(value)}>
                        {formatValue(key, value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )
          })()}

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
