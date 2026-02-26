import { useState } from "react";
import { DetailModal } from "./DetailModal";
import { FileText, Clock, Shield, TrendingDown, BarChart3 } from "lucide-react";

interface ClaimData {
  claimId: string;
  aiConfidence: number;
  originalDays: number;
  currentDays: number;
  status: string;
}

interface Props {
  claim: ClaimData | null;
  onClose: () => void;
}

const CPT_CODES = ["99213", "99214", "99215", "99203", "99204"];
const ICD_CODES = ["Z00.00", "J06.9", "M54.5", "E11.9", "I10"];
const PAYERS = ["BlueCross PPO", "Aetna HMO", "UHC Choice Plus", "Cigna OAP", "Humana Gold"];

export function ClaimDetailModal({ claim, onClose }: Props) {
  const [tab, setTab] = useState<"detail" | "policy" | "compare">("detail");

  if (!claim) return null;

  const payer = PAYERS[Math.abs(claim.claimId.charCodeAt(1)) % PAYERS.length];
  const cpt = CPT_CODES[Math.abs(claim.claimId.charCodeAt(2)) % CPT_CODES.length];
  const icd = ICD_CODES[Math.abs(claim.claimId.charCodeAt(3)) % ICD_CODES.length];
  const timeSaved = ((claim.originalDays - claim.currentDays) * 8 * 60).toFixed(0);
  const errorReduction = (claim.aiConfidence * 0.95 / 100 * 100).toFixed(0);

  return (
    <DetailModal open={!!claim} onClose={onClose} title={`Claim Review — ${claim.claimId}`} width="max-w-xl">
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 bg-secondary rounded-md p-0.5">
          {(["detail", "policy", "compare"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-1.5 text-[10px] font-medium rounded transition-all ${
                tab === t ? "reflect-gradient text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "detail" ? "Details" : t === "policy" ? "Policy Logic" : "Manual vs AI"}
            </button>
          ))}
        </div>

        {tab === "detail" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-muted-foreground block text-[9px] uppercase tracking-widest">Claim ID</span>
                <span className="font-mono font-semibold text-foreground">{claim.claimId}</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-muted-foreground block text-[9px] uppercase tracking-widest">Payer</span>
                <span className="font-semibold text-foreground">{payer}</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-muted-foreground block text-[9px] uppercase tracking-widest">CPT Code</span>
                <span className="font-mono font-semibold text-foreground">{cpt}</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                <span className="text-muted-foreground block text-[9px] uppercase tracking-widest">ICD-10</span>
                <span className="font-mono font-semibold text-foreground">{icd}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">AI Adjudication Summary</span>
              <p className="text-[11px] text-foreground leading-relaxed">
                Claim {claim.claimId} for {payer} was processed through AI adjudication pipeline. CPT {cpt} with diagnosis {icd} matched
                payer contract terms. AI confidence: {claim.aiConfidence}%. {claim.status === "approved" ? "Approved with no manual review required." : "Currently under AI review."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                <Clock className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                <span className="text-[9px] text-muted-foreground block">Time Saved</span>
                <span className="text-sm font-bold font-mono text-primary">{timeSaved}m</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                <TrendingDown className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-1" />
                <span className="text-[9px] text-muted-foreground block">Error Reduction</span>
                <span className="text-sm font-bold font-mono text-emerald-600">{errorReduction}%</span>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
                <Shield className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                <span className="text-[9px] text-muted-foreground block">Compliance</span>
                <span className="text-sm font-bold font-mono text-emerald-600">Pass</span>
              </div>
            </div>
          </div>
        )}

        {tab === "policy" && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Policy Rule Engine</span>
              <div className="mt-2 space-y-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Rule 1: CPT {cpt} is covered under {payer} contract → <span className="text-emerald-600 font-medium">PASS</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Rule 2: ICD-10 {icd} maps to approved procedure category → <span className="text-emerald-600 font-medium">PASS</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Rule 3: No duplicate billing detected within 90 days → <span className="text-emerald-600 font-medium">PASS</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Rule 4: Provider is in-network for member plan → <span className="text-emerald-600 font-medium">PASS</span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "compare" && (
          <div className="space-y-3">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Metric</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Manual</th>
                  <th className="text-left py-2 text-primary font-semibold">AI</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2">Cycle Time</td>
                  <td className="py-2 font-mono">{claim.originalDays.toFixed(1)} days</td>
                  <td className="py-2 font-mono text-primary font-semibold">{claim.currentDays.toFixed(1)} days</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Error Rate</td>
                  <td className="py-2 font-mono">8.2%</td>
                  <td className="py-2 font-mono text-primary font-semibold">0.4%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Compliance Check</td>
                  <td className="py-2">Manual audit</td>
                  <td className="py-2 text-primary font-semibold">Real-time</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2">Reviewer Time</td>
                  <td className="py-2 font-mono">12 min</td>
                  <td className="py-2 font-mono text-primary font-semibold">0 min</td>
                </tr>
                <tr>
                  <td className="py-2">Cost per Claim</td>
                  <td className="py-2 font-mono">$5.60</td>
                  <td className="py-2 font-mono text-primary font-semibold">$0.12</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DetailModal>
  );
}
