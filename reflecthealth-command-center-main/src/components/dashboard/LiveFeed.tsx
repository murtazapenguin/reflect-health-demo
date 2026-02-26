import { useState, useEffect } from "react";
import { Phone, FileText, Zap } from "lucide-react";

// Weighted pool: ~75% Provider, ~25% Member
const CALL_TYPES = [
  // Provider (75%)
  "Provider — Benefits Verification — Cigna PPO",
  "Provider — Eligibility Inquiry — UHC Choice Plus",
  "Provider — Claim Status — BCBS",
  "Provider — Prior Authorization Verification — Anthem",
  "Provider — Coordination of Benefits Verification — Aetna",
  "Provider — Referral Validation — UHC",
  "Provider — Appeal Status Inquiry — Cigna",
  "Provider — Timely Filing Question — BCBS",
  "Provider — Claim Reprocessing Request — Aetna",
  // Member (25%)
  "Member — Claims Status — Cigna PPO",
  "Member — ID Card Request — Anthem",
  "Member — Deductible / OOP Balance Inquiry — UHC",
];

const CLAIMS_ACTIVITY = [
  "Auto-adjudicated: Professional claim #PC-4821",
  "AI flagged: Duplicate billing #CB-1193",
  "Processed: Authorization request #AR-7744",
  "Completed: Pharmacy override #PH-3391",
  "Auto-routed: Out-of-network redirect #ON-5582",
  "Verified: Pre-cert renewal #PC-2207",
];

// Weighted random selection: indices 0-8 = Provider (75%), 9-11 = Member (25%)
function useWeightedRotatingFeed(items: string[], intervalMs: number) {
  const [current, setCurrent] = useState(0);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // 75% chance Provider (indices 0-8), 25% Member (indices 9-11)
      const rand = Math.random();
      const providerCount = 9;
      const idx = rand < 0.75
        ? Math.floor(Math.random() * providerCount)
        : providerCount + Math.floor(Math.random() * (items.length - providerCount));
      setCurrent(idx);
      setKey((k) => k + 1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [items.length, intervalMs]);

  return { item: items[current], key };
}

export function CallTicker() {
  const { item, key } = useWeightedRotatingFeed(CALL_TYPES, 3500);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded bg-secondary/50 border border-border">
      <Phone className="h-3 w-3 text-primary shrink-0" />
      <span key={key} className="text-[10px] text-muted-foreground feed-item-enter truncate">
        <span className="text-primary font-medium">Incoming:</span> {item}
      </span>
    </div>
  );
}

export function ClaimsFeed() {
  const { item, key } = useWeightedRotatingFeed(CLAIMS_ACTIVITY, 4200);

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded bg-secondary/50 border border-border">
      <FileText className="h-3 w-3 text-primary shrink-0" />
      <span key={key} className="text-[10px] text-muted-foreground feed-item-enter truncate">
        {item}
      </span>
    </div>
  );
}

export function InsightCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-secondary/40 border border-border">
      <Zap className="h-3 w-3 text-primary shrink-0 mt-0.5" />
      <span className="text-[10px] text-muted-foreground leading-relaxed">{children}</span>
    </div>
  );
}
