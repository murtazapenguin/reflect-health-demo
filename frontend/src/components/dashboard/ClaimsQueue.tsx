import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { ClaimDetailModal } from "./ClaimDetailModal";

interface ClaimItem {
  id: string;
  claimId: string;
  status: "pending" | "ai-reviewed" | "approved";
  aiConfidence: number;
  originalDays: number;
  currentDays: number;
}

function generateClaim(): ClaimItem {
  const id = Math.floor(10000 + Math.random() * 90000);
  return {
    id: `claim-${id}`,
    claimId: `#${id}`,
    status: "pending",
    aiConfidence: 80 + Math.floor(Math.random() * 18),
    originalDays: 1.5 + Math.random() * 2,
    currentDays: 1.5 + Math.random() * 2,
  };
}

export function ClaimsQueue() {
  const [claims, setClaims] = useState<ClaimItem[]>(() =>
    Array.from({ length: 4 }, generateClaim)
  );
  const [selectedClaim, setSelectedClaim] = useState<ClaimItem | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setClaims(prev => {
        const updated = prev.map(claim => {
          if (claim.status === "pending") {
            return { ...claim, status: "ai-reviewed" as const, currentDays: claim.originalDays * 0.5 };
          }
          if (claim.status === "ai-reviewed") {
            return { ...claim, status: "approved" as const, currentDays: claim.originalDays * 0.3 };
          }
          return claim;
        });

        const hasAllApproved = updated.every(c => c.status === "approved");
        if (hasAllApproved) {
          return Array.from({ length: 4 }, generateClaim);
        }

        return updated;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const statusConfig = {
    pending: { icon: <AlertCircle className="h-3 w-3 text-amber-500" />, label: "Pending", color: "text-amber-600 bg-amber-50" },
    "ai-reviewed": { icon: <Clock className="h-3 w-3 text-primary" />, label: "AI Reviewed", color: "text-primary bg-primary/10" },
    approved: { icon: <CheckCircle className="h-3 w-3 text-emerald-500" />, label: "Approved", color: "text-emerald-600 bg-emerald-50" },
  };

  return (
    <div className="module-panel">
      <div className="module-header">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Simulated Claims Queue</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {claims.map(claim => {
          const config = statusConfig[claim.status];
          return (
            <button
              key={claim.id}
              onClick={() => setSelectedClaim(claim)}
              className="feed-item-enter flex items-center justify-between px-3 py-2 rounded border border-border bg-card hover:border-primary/30 transition-colors w-full text-left"
            >
              <div className="flex items-center gap-3">
                {config.icon}
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-foreground">Claim {claim.claimId}</span>
                  <span className="text-[9px] text-muted-foreground">
                    AI Confidence: {claim.aiConfidence}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-mono text-muted-foreground line-through">
                    {claim.originalDays.toFixed(1)} days
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-primary">
                    {claim.currentDays.toFixed(1)} days
                  </span>
                </div>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${config.color}`}>
                  {config.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <ClaimDetailModal
        claim={selectedClaim ? {
          claimId: selectedClaim.claimId,
          aiConfidence: selectedClaim.aiConfidence,
          originalDays: selectedClaim.originalDays,
          currentDays: selectedClaim.currentDays,
          status: selectedClaim.status,
        } : null}
        onClose={() => setSelectedClaim(null)}
      />
    </div>
  );
}
