import { DetailModal } from "./DetailModal";
import { Building2, TrendingUp, DollarSign, Zap } from "lucide-react";

interface NetworkPartner {
  name: string;
  contractRate: string;
  utilization: number;
  aiRoutingImpact: number;
  savingsAttribution: number;
}

const PARTNERS: NetworkPartner[] = [
  { name: "BlueCross PPO", contractRate: "$142/visit", utilization: 78, aiRoutingImpact: 23, savingsAttribution: 34500 },
  { name: "Aetna HMO", contractRate: "$128/visit", utilization: 65, aiRoutingImpact: 18, savingsAttribution: 28200 },
  { name: "UHC Choice Plus", contractRate: "$155/visit", utilization: 72, aiRoutingImpact: 27, savingsAttribution: 41800 },
  { name: "Cigna OAP", contractRate: "$135/visit", utilization: 61, aiRoutingImpact: 15, savingsAttribution: 22100 },
  { name: "Humana Gold", contractRate: "$119/visit", utilization: 58, aiRoutingImpact: 20, savingsAttribution: 19500 },
];

interface SolutionData {
  name: string;
  adoption: number;
  revenueImpact: number;
  synergyScore: number;
}

const SOLUTIONS: SolutionData[] = [
  { name: "AI Call Deflection", adoption: 92, revenueImpact: 180000, synergyScore: 95 },
  { name: "Claims Auto-Adjudication", adoption: 78, revenueImpact: 145000, synergyScore: 88 },
  { name: "Network Optimization", adoption: 64, revenueImpact: 95000, synergyScore: 72 },
  { name: "Provider Credentialing", adoption: 55, revenueImpact: 62000, synergyScore: 65 },
];

interface Props {
  type: "partner" | "solution" | null;
  index: number;
  onClose: () => void;
}

export function NetworkDetailModal({ type, index, onClose }: Props) {
  if (!type) return null;

  if (type === "partner") {
    const partner = PARTNERS[index] || PARTNERS[0];
    return (
      <DetailModal open title={`Network Partner — ${partner.name}`} onClose={onClose}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
              <DollarSign className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <span className="text-[9px] text-muted-foreground block">Contract Rate</span>
              <span className="text-sm font-bold font-mono text-foreground">{partner.contractRate}</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
              <TrendingUp className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <span className="text-[9px] text-muted-foreground block">Utilization</span>
              <span className="text-sm font-bold font-mono text-foreground">{partner.utilization}%</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
              <Zap className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
              <span className="text-[9px] text-muted-foreground block">AI Routing Impact</span>
              <span className="text-sm font-bold font-mono text-primary">+{partner.aiRoutingImpact}%</span>
            </div>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600 mx-auto mb-1" />
              <span className="text-[9px] text-muted-foreground block">Savings Attribution</span>
              <span className="text-sm font-bold font-mono text-emerald-600">${(partner.savingsAttribution / 1000).toFixed(1)}K</span>
            </div>
          </div>
        </div>
      </DetailModal>
    );
  }

  const solution = SOLUTIONS[index] || SOLUTIONS[0];
  return (
    <DetailModal open title={`Solution Impact — ${solution.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
            <span className="text-[9px] text-muted-foreground block">Adoption</span>
            <span className="text-sm font-bold font-mono text-foreground">{solution.adoption}%</span>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
            <span className="text-[9px] text-muted-foreground block">Revenue Impact</span>
            <span className="text-sm font-bold font-mono text-primary">${(solution.revenueImpact / 1000).toFixed(0)}K</span>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
            <span className="text-[9px] text-muted-foreground block">Synergy Score</span>
            <span className="text-sm font-bold font-mono text-emerald-600">{solution.synergyScore}/100</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full reflect-gradient transition-all" style={{ width: `${solution.adoption}%` }} />
        </div>
      </div>
    </DetailModal>
  );
}

export { PARTNERS, SOLUTIONS };
