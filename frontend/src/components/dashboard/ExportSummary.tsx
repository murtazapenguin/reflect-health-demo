import { DetailModal } from "./DetailModal";
import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal } from "@/lib/format";
import reflectLogo from "@/assets/reflect-health-logo.png";
import penguinLogo from "@/assets/penguin-ai-logo.png";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "internal" | "tpa" | "five9";
}

export function ExportSummary({ open, onClose, type }: Props) {
  const { results, platformParams, callParams, claimsParams } = useDashboard();
  const { combined, callCenter, claims } = results;

  return (
    <DetailModal open={open} onClose={onClose} title={type === "five9" ? "AI Impact Report" : "Executive Summary"} width="max-w-2xl">
      <div className="space-y-5 print:text-black">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <img src={reflectLogo} alt="Reflect Health" className="h-6" />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">Generated: {new Date().toLocaleDateString()}</span>
            <span className="text-[10px] text-muted-foreground block">{type === "internal" ? "Internal Report" : type === "five9" ? "Five9 Integration Impact" : "TPA Demo Report"}</span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-[9px] text-muted-foreground uppercase block">Annual Savings</span>
            <span className="text-lg font-bold font-mono text-primary">{fmtCurrency(combined.totalAnnualSavings)}</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
            <span className="text-[9px] text-muted-foreground uppercase block">ROI</span>
            <span className="text-lg font-bold font-mono text-foreground">{fmtDecimal(combined.roi)}x</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
            <span className="text-[9px] text-muted-foreground uppercase block">Payback</span>
            <span className="text-lg font-bold font-mono text-foreground">{fmtDecimal(combined.paybackMonths)} mo</span>
          </div>
          <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border">
            <span className="text-[9px] text-muted-foreground uppercase block">FTE Saved</span>
            <span className="text-lg font-bold font-mono text-foreground">{fmtDecimal(callCenter.fteSaved + claims.fteSaved)}</span>
          </div>
        </div>

        {/* Breakdown */}
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-muted-foreground font-medium">Category</th>
              <th className="text-right py-2 text-muted-foreground font-medium">Annual Value</th>
              <th className="text-right py-2 text-muted-foreground font-medium">FTE</th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            <tr className="border-b border-border/50">
              <td className="py-2">Call Center AI Deflection</td>
              <td className="py-2 text-right font-mono">{fmtCurrency(callCenter.annualSavings)}</td>
              <td className="py-2 text-right font-mono">{fmtDecimal(callCenter.fteSaved)}</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2">Claims Auto-Adjudication</td>
              <td className="py-2 text-right font-mono">{fmtCurrency(claims.annualSavings)}</td>
              <td className="py-2 text-right font-mono">{fmtDecimal(claims.fteSaved)}</td>
            </tr>
            {type === "internal" && (
              <tr className="border-b border-border/50">
                <td className="py-2">Platform Investment</td>
                <td className="py-2 text-right font-mono text-destructive">({fmtCurrency(platformParams.annualPlatformCost)})</td>
                <td className="py-2 text-right">—</td>
              </tr>
            )}
            <tr className="font-semibold">
              <td className="py-2">Net Impact</td>
              <td className="py-2 text-right font-mono text-primary">{fmtCurrency(combined.totalAnnualSavings)}</td>
              <td className="py-2 text-right font-mono">{fmtDecimal(callCenter.fteSaved + claims.fteSaved)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex items-center justify-center gap-2 pt-3 border-t border-border">
          <img src={penguinLogo} alt="Penguin AI" className="h-3 opacity-40" />
          <span className="text-[9px] text-muted-foreground">Powered by Penguin AI · Reflect Health © 2026</span>
        </div>
      </div>
    </DetailModal>
  );
}
