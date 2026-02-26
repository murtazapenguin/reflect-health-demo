import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCallDetail, useUpdateTags, useUpdateFlag } from "@/hooks/use-api";
import { format } from "date-fns";
import {
  ArrowLeft, Flag, Phone, Clock, User, ShieldCheck, X, Plus, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import reflectLogo from "@/assets/reflect-health-logo.png";

const LABEL_MAP: Record<string, string> = {
  call_intent: "Intent", npi: "NPI", zip_code: "Zip Code", provider_name: "Provider",
  patient_name: "Patient", patient_dob: "DOB", claim_number: "Claim #", valid: "NPI Valid",
  verified: "Zip Verified", found: "Lookup Result", message: "Details",
  service_type: "Service", service_covered: "Covered", service_copay: "Service Copay",
  service_coinsurance: "Coinsurance", service_prior_auth: "Prior Auth Required",
  service_visit_limit: "Visit Limit", service_notes: "Service Notes",
  plan_name: "Plan", status: "Member Status", member_id: "Member ID",
  effective_date: "Effective Date", term_date: "Term Date", copay_primary: "Primary Copay",
  copay_specialist: "Specialist Copay", deductible: "Deductible", deductible_met: "Deductible Met",
  cob_status: "COB Status", out_of_pocket_max: "OOP Max", out_of_pocket_met: "OOP Met",
  pa_id: "PA Request ID", pa_status: "PA Status", service_description: "Service",
  procedure_code: "CPT Code", urgency: "Urgency", submitted_date: "Submitted",
  decision_date: "Decision Date", expiration_date: "Expires", approved_units: "Approved Units",
  denial_reason: "Denial Reason", notes: "Notes",
};

const BOOL_KEYS = new Set(["found", "valid", "verified", "service_covered", "service_prior_auth"]);
const DOLLAR_KEYS = new Set(["service_copay", "copay_primary", "copay_specialist", "deductible", "deductible_met", "out_of_pocket_max", "out_of_pocket_met"]);
const PA_STATUS_MAP: Record<string, string> = { approved: "Approved", denied: "Denied", pending_review: "Pending Review", in_review: "In Review", expired: "Expired" };

function formatValue(key: string, val: unknown): string {
  const s = String(val);
  if (key === "found") return s === "true" ? "Found" : "Not Found";
  if (key === "valid" || key === "verified") return s === "true" ? "Yes" : "No";
  if (key === "service_covered") return s === "true" ? "Yes" : s === "false" ? "No" : "Unknown";
  if (key === "service_prior_auth") return s === "true" ? "Yes" : "No";
  if (key === "service_coinsurance" && val != null) return `${val}%`;
  if (DOLLAR_KEYS.has(key) && val != null) return `$${val}`;
  if (key === "pa_status") return PA_STATUS_MAP[s] || s;
  if (key === "urgency") return s === "urgent" ? "Urgent" : "Routine";
  return s;
}

function valueColor(key: string, val: unknown): string {
  const s = String(val);
  if (key === "found") return s === "true" ? "text-emerald-600" : "text-amber-600";
  if (key === "service_covered") return s === "true" ? "text-emerald-600" : s === "false" ? "text-red-600" : "text-amber-600";
  if (key === "valid" || key === "verified") return s === "true" ? "text-emerald-600" : "text-red-600";
  if (key === "service_prior_auth") return s === "true" ? "text-amber-600" : "text-emerald-600";
  if (key === "pa_status") return s === "approved" ? "text-emerald-600" : s === "denied" ? "text-red-600" : s === "expired" ? "text-muted-foreground" : "text-amber-600";
  if (key === "urgency") return s === "urgent" ? "text-red-600" : "text-foreground";
  return "text-foreground";
}

export default function CallDetailPage() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { data: call, isLoading, error } = useCallDetail(callId);
  const tagsMutation = useUpdateTags(callId!);
  const flagMutation = useUpdateFlag(callId!);
  const [newTag, setNewTag] = useState("");

  const handleToggleFlag = () => {
    if (!call) return;
    flagMutation.mutate(!call.flagged);
  };

  const handleAddTag = () => {
    if (!call || !newTag.trim()) return;
    const tags = [...new Set([...call.tags, newTag.trim().toLowerCase()])];
    tagsMutation.mutate(tags);
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    if (!call) return;
    tagsMutation.mutate(call.tags.filter((t) => t !== tag));
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const fmtDate = (d?: string) => d ? format(new Date(d), "MMM d, yyyy h:mm:ss a") : "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground mb-2">Call not found</p>
        <Button variant="link" onClick={() => navigate("/calls")}>Back to Call Log</Button>
      </div>
    );
  }

  const data = call.extracted_data || {};
  const lookupFailed = data.found === "false" || data.found === false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/90 backdrop-blur-sm">
        <div className="px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={reflectLogo} alt="Reflect Health" className="h-8 cursor-pointer" onClick={() => navigate("/")} />
            <span className="text-[10px] text-muted-foreground border-l border-border pl-3">Call Detail</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => navigate("/")}>Dashboard</Button>
            <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => navigate("/calls")}>Call Log</Button>
            <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground" onClick={handleLogout}>
              <LogOut className="h-3 w-3 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-5 space-y-4">
        {/* Title row */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigate("/calls")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">
              {call.intent === "eligibility" ? "Eligibility Check" : call.intent === "claims" ? "Claims Inquiry" : call.intent === "prior_auth" ? "Prior Auth Request" : "Inbound Call"}
              {call.provider_name ? ` — ${call.provider_name}` : ""}
            </h2>
            <p className="type-micro text-muted-foreground">
              {fmtDate(call.started_at)}{call.patient_name ? ` · Patient: ${call.patient_name}` : ""}
            </p>
          </div>
          <Button
            variant={call.flagged ? "destructive" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={handleToggleFlag}
            title={call.flagged ? "Unflag" : "Flag for review"}
          >
            <Flag className={`h-4 w-4 ${call.flagged ? "fill-current" : ""}`} />
          </Button>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1"><Clock className="w-3.5 h-3.5 text-muted-foreground" /><span className="type-micro text-muted-foreground uppercase">Duration</span></div>
            <p className="text-xl font-bold font-mono text-foreground">{call.duration_seconds}s</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1"><Phone className="w-3.5 h-3.5 text-muted-foreground" /><span className="type-micro text-muted-foreground uppercase">Intent</span></div>
            <Badge className={call.intent === "eligibility" ? "bg-blue-100 text-blue-800" : call.intent === "claims" ? "bg-purple-100 text-purple-800" : call.intent === "prior_auth" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-600"}>
              {call.intent === "prior_auth" ? "prior auth" : call.intent || "unknown"}
            </Badge>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1"><User className="w-3.5 h-3.5 text-muted-foreground" /><span className="type-micro text-muted-foreground uppercase">Outcome</span></div>
            <Badge className={call.outcome === "resolved" ? "bg-emerald-100 text-emerald-800" : call.outcome === "transferred" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
              {call.outcome}
            </Badge>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" /><span className="type-micro text-muted-foreground uppercase">Auth</span></div>
            <Badge className={call.auth_success ? "bg-emerald-100 text-emerald-800" : call.auth_success === false ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"}>
              {call.auth_success ? "Success" : call.auth_success === false ? "Failed" : "N/A"}
            </Badge>
          </CardContent></Card>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Transcript */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Transcript</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-auto space-y-3">
                  {call.transcript.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No transcript available</p>
                  ) : call.transcript.map((entry, idx) => (
                    <div key={idx} className={`flex ${entry.speaker === "AI" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                        entry.speaker === "AI" ? "bg-primary/5 border border-primary/15" : "bg-secondary border border-border"
                      }`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                          entry.speaker === "AI" ? "reflect-gradient-text" : "text-muted-foreground"
                        }`}>{entry.speaker}</p>
                        <p className="text-sm text-foreground leading-relaxed">{entry.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {call.recording_url && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Recording</CardTitle></CardHeader>
                <CardContent>
                  <audio controls className="w-full" src={call.recording_url}>
                    Your browser does not support the audio element.
                  </audio>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Call Info</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-2.5">
                  {([
                    ["Provider", call.provider_name], ["NPI", call.provider_npi],
                    ["Patient", call.patient_name], ["DOB", call.patient_dob],
                    ["From", call.phone_from], ["To", call.phone_to],
                    ["Started", fmtDate(call.started_at)], ["Ended", fmtDate(call.ended_at)],
                  ] as [string, string | undefined][]).map(([label, value]) => value ? (
                    <div key={label} className="flex justify-between">
                      <dt className="type-micro text-muted-foreground">{label}</dt>
                      <dd className="text-xs font-medium text-foreground text-right">{value}</dd>
                    </div>
                  ) : null)}
                </dl>
              </CardContent>
            </Card>

            {Object.keys(data).length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Extracted Data</CardTitle></CardHeader>
                <CardContent>
                  {lookupFailed && (
                    <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-xs font-semibold text-amber-800 mb-0.5">
                        {data.claim_number ? "Claim Not Found" : data.patient_name ? "Patient Not Found" : "Lookup Failed"}
                      </p>
                      {data.message && <p className="text-[11px] text-amber-700 leading-relaxed">{String(data.message)}</p>}
                    </div>
                  )}
                  <dl className="space-y-2">
                    {Object.entries(data).filter(([key]) => key !== "message").map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <dt className="type-micro text-muted-foreground">{LABEL_MAP[key] || key}</dt>
                        <dd className={`text-xs font-medium text-right max-w-[60%] truncate ${valueColor(key, value)}`} title={String(value)}>
                          {formatValue(key, value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {call.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs bg-primary/10 text-primary border border-primary/20 gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    placeholder="Add tag..."
                    className="text-xs h-8"
                  />
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={handleAddTag}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {call.transferred && (
              <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-800">Transfer Context</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Call was transferred to a human agent.
                    {call.provider_name && ` Provider: ${call.provider_name}.`}
                    {call.intent && ` Original intent: ${call.intent}.`}
                    {call.auth_success && " Provider was authenticated."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
