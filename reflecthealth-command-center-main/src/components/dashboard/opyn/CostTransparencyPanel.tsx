import { useState, useEffect, useRef } from "react";
import { CheckCircle, AlertTriangle, X, Calendar, MapPin, Star, ArrowRight, Stethoscope, Building2, FileText, Phone, Search } from "lucide-react";
import penguinLogo from "@/assets/penguin-logo-pink.png";
import { type OpynSimSession, type SimPhase } from "./useOpynSimulation";

/* ─── CountUp ─── */
function CountUp({ target, prefix = "$", duration = 900, className = "" }: { target: number; prefix?: string; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (Math.abs(diff) < 1) { setDisplay(target); prevRef.current = target; return; }
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) frameRef.current = requestAnimationFrame(tick);
      else prevRef.current = target;
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <span className={className}>{prefix}{display.toLocaleString()}</span>;
}

/* ─── Star Rating ─── */
function StarRating({ rating, max = 4, animate = false }: { rating: number; max?: number; animate?: boolean }) {
  const [show, setShow] = useState(!animate);
  useEffect(() => { if (animate) { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); } }, [animate]);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 transition-all duration-300 ${show ? "opacity-100 scale-100" : "opacity-0 scale-50"} ${i < Math.floor(rating) ? "fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" : i < rating ? "fill-[hsl(var(--accent)/0.5)] text-[hsl(var(--accent))]" : "text-border fill-border"}`} style={animate ? { transitionDelay: `${i * 80}ms` } : undefined} />
      ))}
    </div>
  );
}

interface CostTransparencyPanelProps {
  sim: {
    session: OpynSimSession | null;
    phase: SimPhase;
    setPhase: (p: SimPhase) => void;
    startSimulation: () => OpynSimSession;
    resetSimulation: () => void;
  };
}

export function CostTransparencyPanel({ sim }: CostTransparencyPanelProps) {
  const { session, phase } = sim;
  const [appointmentFlow, setAppointmentFlow] = useState(false);
  const [appointmentStep, setAppointmentStep] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Determine if we're in a live sim that has reached provider_search
  const isLive = session !== null && (phase as string) !== "idle";
  const showCards = !isLive || ((phase as string) !== "idle" && phase !== "intent_detected" && phase !== "plan_loaded" && phase !== "searching_providers");
  const isSearching = isLive && phase === "searching_providers";

  // Use session data or defaults
  const inProv = session?.inNetworkProvider ?? { name: "Malhotra, Priya, MD", facility: "Essex Bone and Joint", rating: 3, distance: 2, address: "562 River Road", city: "Essex, CT 06409" };
  const outProv = session?.outOfNetworkProvider ?? { name: "Ross, Callum, MD", facility: "OakView Orthopedic", rating: 2.5, distance: 22, address: "10 Bishop Lane", city: "Old Saybrook, CT 06475" };
  const procCost = session?.procedureCost ?? 35562;
  const youPayIn = session?.inNetworkYouPay ?? 8000;
  const outTotal = session?.outOfNetworkTotal ?? 54232;
  const youPayOut = session?.outOfNetworkYouPay ?? 44502;
  const outPlanPays = session?.outOfNetworkPlanPays ?? 9730;
  const balanceBilling = outTotal - (outPlanPays ?? 0) - (session ? 0 : 0);
  const savingsDiff = youPayOut - youPayIn;
  const edgeCase = session?.edgeCase ?? "none";

  const startAppointment = () => { setAppointmentFlow(true); setAppointmentStep(0); };
  const nextAppointmentStep = () => { setAppointmentStep(s => s < 3 ? s + 1 : 4); };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-foreground">Cost Transparency & Provider Search</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Total Knee Replacement — Procedure Comparison
          {isLive && session && <span className="ml-2 text-[hsl(var(--opyn-green))] font-semibold">• {session.planTier}</span>}
        </p>
      </div>

      {/* Searching state */}
      {isSearching && (
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-3 animate-in fade-in duration-300">
          <Search className="h-6 w-6 text-[hsl(var(--opyn-purple))] animate-pulse" />
          <p className="text-sm font-semibold text-foreground">Searching Providers…</p>
          <p className="text-[10px] text-muted-foreground">Filtering by plan, network, and specialty</p>
        </div>
      )}

      {/* Edge case banners */}
      {showCards && edgeCase === "prior_auth_required" && (
        <div className="rounded-xl border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.08)] p-3 flex items-center gap-2 text-[11px] animate-in fade-in duration-300">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent))] shrink-0" />
          <div>
            <span className="font-semibold text-foreground">Prior Authorization Required</span>
            <p className="text-muted-foreground">PA has been auto-initiated for this procedure.</p>
          </div>
        </div>
      )}
      {showCards && edgeCase === "pending_review" && (
        <div className="rounded-xl border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.08)] p-3 flex items-center gap-2 text-[11px] animate-in fade-in duration-300">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent))] shrink-0" />
          <div>
            <span className="font-semibold text-foreground">Cost Estimate Pending Medical Review</span>
            <p className="text-muted-foreground">Final out-of-pocket may be adjusted after review.</p>
          </div>
        </div>
      )}

      {/* Provider Cards */}
      {showCards && (
        <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ${isLive ? "animate-in fade-in slide-in-from-bottom-3 duration-500" : ""}`}>
          {/* In-Network Card */}
          <div className={`rounded-2xl border-2 border-[hsl(var(--opyn-green)/0.3)] bg-card p-5 space-y-4 shadow-sm transition-shadow duration-700 ${isLive ? "shadow-[0_0_20px_-4px_hsl(var(--opyn-green)/0.15)]" : ""}`}>
            <span className="inline-block text-xs font-semibold text-foreground bg-[hsl(var(--opyn-green-light))] px-3 py-1 rounded-full">In-Network</span>
            <div><h3 className="text-lg font-bold text-foreground">Total Knee Replacement</h3></div>
            <div>
              <p className="text-sm font-bold text-foreground">{inProv.name}</p>
              <p className="text-xs text-muted-foreground">{inProv.facility}</p>
            </div>
            <StarRating rating={inProv.rating} animate={isLive} />
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{inProv.address}</p>
              <p>{inProv.city}</p>
              <p className="font-medium">{inProv.distance} miles</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl bg-[hsl(var(--opyn-green-light))] p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cost</p>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {isLive ? <CountUp target={procCost} /> : `$${procCost.toLocaleString()}`}
                </p>
              </div>
              <div className="flex-1 rounded-xl bg-[hsl(var(--opyn-green-light))] p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">You Pay</p>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {isLive ? <CountUp target={youPayIn} /> : `$${youPayIn.toLocaleString()}`}
                </p>
              </div>
            </div>
            {session && (
              <div className="rounded-lg bg-secondary/60 p-2 text-[9px] text-muted-foreground space-y-0.5">
                <div className="flex justify-between"><span>Deductible remaining</span><span className="font-semibold font-mono">${session.deductibleRemaining.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Coinsurance</span><span className="font-semibold">{Math.round(session.coinsurance * 100)}%</span></div>
                <div className="flex justify-between"><span>OOP Max</span><span className="font-semibold font-mono">${session.oopMax.toLocaleString()}</span></div>
              </div>
            )}
            <button
              onClick={startAppointment}
              className="w-full py-3 text-sm font-semibold rounded-xl border-2 border-border text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4 text-[hsl(var(--opyn-purple))]" />
              Schedule Appointment
            </button>
          </div>

          {/* Out-of-Network Card */}
          <div className={`rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm transition-all duration-700 ${isLive ? "animate-in fade-in duration-700" : ""}`} style={isLive ? { animationDelay: "200ms" } : undefined}>
            <span className="inline-block text-xs font-semibold text-foreground bg-[hsl(var(--accent)/0.15)] px-3 py-1 rounded-full">Out-of-Network</span>
            <div><h3 className="text-lg font-bold text-foreground">Total Knee Replacement</h3></div>
            <div>
              <p className="text-sm font-bold text-foreground">{outProv.name}</p>
              <p className="text-xs text-muted-foreground">{outProv.facility}</p>
            </div>
            <StarRating rating={outProv.rating} animate={isLive} />
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{outProv.address}</p>
              <p>{outProv.city}</p>
              <p className="font-medium">{outProv.distance} miles</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl bg-secondary p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cost</p>
                <p className="text-2xl font-bold font-mono text-foreground">
                  {isLive ? <CountUp target={outTotal} /> : `$${outTotal.toLocaleString()}`}
                </p>
              </div>
              <div className="flex-1 rounded-xl bg-[hsl(var(--accent)/0.12)] p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">You Pay</p>
                <p className="text-2xl font-bold font-mono text-[hsl(var(--accent))]">
                  {isLive ? <CountUp target={youPayOut} className="text-[hsl(var(--accent))]" /> : `$${youPayOut.toLocaleString()}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDetailsOpen(true)}
              className="w-full py-3 text-sm font-semibold rounded-xl border-2 border-border text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              Verify Details
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 justify-center">
        <img src={penguinLogo} alt="" className="h-3.5 w-3.5 object-contain opacity-60" />
        <span className="text-[10px] text-muted-foreground">Orchestrated by Penguin AI</span>
      </div>

      {/* Schedule Appointment Flow */}
      {appointmentFlow && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setAppointmentFlow(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[hsl(var(--opyn-green))]" />
                <h3 className="text-sm font-semibold">Schedule Appointment</h3>
              </div>
              <button onClick={() => setAppointmentFlow(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex items-center gap-1">
              {["Provider", "Date & Time", "Details", "Confirm"].map((s, i) => (
                <div key={s} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`h-1.5 w-full rounded-full transition-colors ${appointmentStep >= i ? "bg-[hsl(var(--opyn-green))]" : "bg-border"}`} />
                  <span className={`text-[8px] ${appointmentStep >= i ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{s}</span>
                </div>
              ))}
            </div>

            {appointmentStep === 0 && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">AI-recommended providers for Total Knee Replacement:</p>
                {[
                  { name: inProv.name, facility: inProv.facility, rating: inProv.rating, distance: `${inProv.distance} miles`, address: `${inProv.address}, ${inProv.city}`, preferred: true },
                  { name: "Patel, Anita, MD", facility: "Midwest Orthopedic Surgery", rating: 3.5, distance: "15 miles", address: "420 Health Blvd, Denver, CO", preferred: false },
                  { name: "Fraser, Ewan, MD", facility: "Ewan Orthopedic Partners", rating: 3, distance: "22 miles", address: "88 Summit Dr, Boulder, CO", preferred: false },
                ].map((p) => (
                  <div key={p.name} className="rounded-2xl border border-border bg-card p-4 hover:border-[hsl(var(--opyn-green)/0.5)] cursor-pointer transition-all hover:shadow-md" onClick={nextAppointmentStep}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        {p.preferred && <span className="inline-block text-[10px] font-semibold bg-[hsl(var(--opyn-green-light))] text-foreground px-2 py-0.5 rounded-full mb-1.5">Preferred</span>}
                        <p className="text-sm font-bold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.facility}</p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                        <Stethoscope className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <StarRating rating={p.rating} />
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      <p>{p.address}</p>
                      <p className="font-medium mt-0.5">{p.distance}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {appointmentStep === 1 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[11px]">
                  <Stethoscope className="h-3.5 w-3.5 text-[hsl(var(--opyn-green))]" />
                  <span className="font-semibold">{inProv.name}</span>
                  <span className="text-muted-foreground">• {inProv.facility}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Available time slots:</p>
                <div className="grid grid-cols-3 gap-2">
                  {["Mon, Mar 3", "Wed, Mar 5", "Thu, Mar 6", "Mon, Mar 10", "Tue, Mar 11", "Fri, Mar 14"].map((d) => (
                    <button key={d} onClick={nextAppointmentStep} className="rounded-lg border border-border p-2 text-center hover:border-[hsl(var(--opyn-green)/0.5)] hover:bg-[hsl(var(--opyn-green-light))] transition-colors">
                      <p className="text-[10px] font-semibold">{d}</p>
                      <p className="text-[9px] text-muted-foreground">9:00 AM</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {appointmentStep === 2 && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">Review & confirm details:</p>
                <div className="rounded-xl border border-border p-3 space-y-2">
                  {[
                    { icon: Stethoscope, label: "Provider", value: inProv.name },
                    { icon: Building2, label: "Facility", value: inProv.facility },
                    { icon: Calendar, label: "Date", value: "Mon, March 3, 2026 at 9:00 AM" },
                    { icon: FileText, label: "Procedure", value: "Total Knee Replacement (CPT 27447)" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-2 text-[10px]">
                      <r.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground w-16">{r.label}</span>
                      <span className="font-semibold">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-[hsl(var(--opyn-green)/0.3)] bg-[hsl(var(--opyn-green-light))] p-3 space-y-1">
                  <p className="text-[10px] font-semibold text-[hsl(var(--opyn-green))]">Estimated Cost Summary</p>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Procedure Cost</span><span className="font-semibold">${procCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Insurance Covers</span><span className="font-semibold text-[hsl(var(--opyn-green))]">-${(procCost - youPayIn).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[10px] pt-1 border-t border-[hsl(var(--opyn-green)/0.2)]">
                    <span className="font-semibold">Your Estimated Cost</span><span className="font-bold text-[hsl(var(--opyn-green))]">${youPayIn.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={nextAppointmentStep} className="w-full py-2.5 text-[11px] font-semibold rounded-lg bg-[hsl(var(--opyn-green))] text-white hover:opacity-90 transition-opacity">
                  Confirm Appointment
                </button>
              </div>
            )}

            {appointmentStep === 3 && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">Processing your appointment…</p>
                <AppointmentProcessing onDone={nextAppointmentStep} />
              </div>
            )}

            {appointmentStep === 4 && (
              <div className="text-center space-y-3 py-4">
                <div className="h-12 w-12 rounded-full bg-[hsl(var(--opyn-green-light))] flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6 text-[hsl(var(--opyn-green))]" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Appointment Confirmed!</p>
                  <p className="text-[10px] text-muted-foreground">{inProv.name} • Mon, March 3 at 9:00 AM</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-left space-y-1.5">
                  <p className="text-[9px] font-semibold text-muted-foreground">AUTOMATED ACTIONS</p>
                  {["Prior Authorization submitted (PA-44822)", "Referral request sent to PCP", "Pre-op checklist emailed to member", "Calendar invite sent", "Transportation assistance offered"].map((a) => (
                    <div key={a} className="flex items-center gap-1.5 text-[10px]">
                      <CheckCircle className="h-3 w-3 text-[hsl(var(--opyn-green))]" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <img src={penguinLogo} alt="" className="h-3 w-3 object-contain" />
                  <span className="text-[9px] text-muted-foreground">Fully orchestrated by Penguin AI</span>
                </div>
                <button onClick={() => setAppointmentFlow(false)} className="mt-2 px-4 py-1.5 text-[10px] font-medium rounded-lg border border-border hover:bg-secondary transition-colors">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetailsOpen(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent))]" />
                Out-of-Network Cost Breakdown
              </h3>
              <button onClick={() => setDetailsOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-2">
              {[
                { label: "Facility Fee", value: `$${Math.round(outTotal * 0.59).toLocaleString()}` },
                { label: "Surgeon Fee", value: `$${Math.round(outTotal * 0.29).toLocaleString()}` },
                { label: "Anesthesia", value: `$${Math.round(outTotal * 0.08).toLocaleString()}` },
                { label: "Lab / Imaging", value: `$${Math.round(outTotal * 0.04).toLocaleString()}` },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-[11px] py-1.5 border-b border-border last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold font-mono">{item.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-[11px] pt-2 font-bold">
                <span>Total Billed</span><span className="font-mono">${outTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.05)] p-3 space-y-1.5">
              <p className="text-[10px] font-semibold text-[hsl(var(--accent))]">⚠ Out-of-Network Impact</p>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Plan Pays (60% UCR)</span><span className="font-semibold">${outPlanPays.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Balance Billing Risk</span><span className="font-semibold text-[hsl(var(--accent))]">${(outTotal - outPlanPays - youPayOut + youPayOut - outPlanPays > 0 ? outTotal - outPlanPays - youPayOut : 0).toLocaleString()}</span></div>
                <div className="flex justify-between pt-1 border-t border-[hsl(var(--accent)/0.2)]"><span className="font-semibold">Your Total Cost</span><span className="font-bold text-[hsl(var(--accent))]">${youPayOut.toLocaleString()}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--opyn-green)/0.3)] bg-[hsl(var(--opyn-green-light))] p-3">
              <div className="flex items-center gap-2">
                <img src={penguinLogo} alt="" className="h-4 w-4 object-contain" />
                <div>
                  <p className="text-[10px] font-semibold text-[hsl(var(--opyn-green))]">AI Recommendation</p>
                  <p className="text-[9px] text-muted-foreground">Choosing in-network saves you <span className="font-bold">${savingsDiff.toLocaleString()}</span>. Want to schedule with {inProv.name.split(",")[0]}?</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setDetailsOpen(false)} className="flex-1 py-2 text-[11px] font-medium rounded-lg border border-border hover:bg-secondary transition-colors">
                Close
              </button>
              <button onClick={() => setDetailsOpen(false)} className="flex-1 py-2 text-[11px] font-semibold rounded-lg bg-[hsl(var(--opyn-green))] text-white hover:opacity-90 transition-opacity">
                Switch to In-Network
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentProcessing({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Verifying insurance coverage…",
    "Checking prior authorization requirements…",
    "Reserving appointment slot…",
    "Generating pre-op instructions…",
    "Finalizing booking…",
  ];

  useState(() => {
    let s = 0;
    const iv = setInterval(() => {
      s++;
      setStep(s);
      if (s >= steps.length) {
        clearInterval(iv);
        setTimeout(onDone, 600);
      }
    }, 800);
  });

  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className={`flex items-center gap-2 text-[10px] transition-opacity duration-300 ${step >= i ? "opacity-100" : "opacity-30"}`}>
          {step > i ? (
            <CheckCircle className="h-3 w-3 text-[hsl(var(--opyn-green))]" />
          ) : step === i ? (
            <div className="h-3 w-3 rounded-full border-2 border-[hsl(var(--opyn-purple))] border-t-transparent animate-spin" />
          ) : (
            <div className="h-3 w-3 rounded-full border border-border" />
          )}
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
}
