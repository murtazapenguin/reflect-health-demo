import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useDashboard } from "./DashboardContext";

export type EventStatus = "ai-routed" | "escalated" | "resolved" | "in-progress";
export type CallerType = "Provider" | "Member";

export interface SimEvent {
  id: string;
  timestamp: Date;
  callerType: CallerType;
  reason: string;
  payer: string;
  status: EventStatus;
  aiConfidence: number;
  resolutionTimeSec: number;
}

export interface ClaimsEvent {
  id: string;
  timestamp: Date;
  claimId: string;
  type: string;
  confidence: number;
  adjudicationTimeSec: number;
  manualReviewAvoided: boolean;
  status: "auto" | "manual" | "exception";
}

export interface NetworkEvent {
  id: string;
  timestamp: Date;
  type: string;
  savings: number;
  network: string;
  planImpact: string;
  memberImpact: string;
}

export interface ROIEvent {
  id: string;
  timestamp: Date;
  type: string;
  value: number;
  detail: string;
}

interface PipelineState {
  activeStage: number;
  confidence: number;
  resolutionTime: number;
  outcome: string;
}

interface SimulationState {
  events: SimEvent[];
  claimsEvents: ClaimsEvent[];
  networkEvents: NetworkEvent[];
  roiEvents: ROIEvent[];
  pipeline: PipelineState;
  claimsPipeline: PipelineState;
  networkPipeline: PipelineState;
  roiPipeline: PipelineState;
  counters: {
    callsDeflected: number;
    manualMinutesSaved: number;
    costAvoided: number;
    fteEquivalent: number;
  };
  claimsCounters: {
    autoAdjudicated: number;
    manualReviewsAvoided: number;
    cycleTimeReductionPct: number;
    errorRateReductionPct: number;
    costAvoided: number;
    fteImpact: number;
  };
  networkCounters: {
    savingsGenerated: number;
    oonAvoidanceRate: number;
    marketplaceUtilLift: number;
    pmpmReduction: number;
    memberDisruptionReductionPct: number;
  };
  roiCounters: {
    totalAnnualizedSavings: number;
    roiMultiple: number;
    paybackMonths: number;
    productivityLiftPct: number;
    marginExpansionPct: number;
  };
  isRunning: boolean;
}

const SimulationContext = createContext<SimulationState | null>(null);

// Weighted caller type: 75% Provider, 25% Member (no Broker)
function weightedCallerType(): CallerType {
  const r = Math.random();
  if (r < 0.75) return "Provider";
  return "Member";
}

const PROVIDER_REASONS = [
  "Benefits Verification", "Eligibility Inquiry", "Claim Status",
  "Prior Authorization Verification", "Coordination of Benefits Verification",
  "Referral Validation", "Appeal Status Inquiry", "Timely Filing Question",
  "Claim Reprocessing Request",
];
const MEMBER_REASONS = [
  "Claims Status", "ID Card Request", "Deductible / OOP Balance Inquiry",
  "Pharmacy Coverage Question",
];
function reasonForType(type: CallerType): string {
  if (type === "Provider") return PROVIDER_REASONS[Math.floor(Math.random() * PROVIDER_REASONS.length)];
  return MEMBER_REASONS[Math.floor(Math.random() * MEMBER_REASONS.length)];
}

const PAYERS = ["BCBS", "Aetna", "UHC", "Cigna", "Anthem"];

const CLAIMS_TYPES = [
  "Claim Received", "Claim Auto-Adjudicated", "Claim Flagged for Manual Review",
  "Documentation Validated", "Policy Conflict Detected", "Claim Paid", "Claim Denied (Rule-Based)"
];
const CLAIM_IDS = () => `CLM-${Math.floor(1000 + Math.random() * 9000)}`;

const NETWORK_TYPES = [
  "Network Routing Optimization", "Out-of-Network Redirected", "Contract Rate Applied",
  "Specialty Network Match", "Marketplace Solution Activated", "Stop-Loss Triggered"
];
const NETWORKS = ["BlueCross PPO", "Aetna HMO", "UHC Choice Plus", "Cigna OAP", "Anthem EPO"];
const PLAN_IMPACTS = ["Reduced PMPM", "SLA Improved", "Cost Contained", "Coverage Expanded"];
const MEMBER_IMPACTS = ["No Disruption", "Minimal Change", "Improved Access", "Lower OOP"];

const ROI_TYPES = [
  "ROI Threshold Reached", "Savings Milestone Hit", "Cost Avoidance Event Logged",
  "SLA Improvement Trigger", "Productivity Lift Increment"
];

function generateEvent(eligiblePct: number, accuracyPct: number): SimEvent {
  const callerType = weightedCallerType();
  const reason = reasonForType(callerType);
  const payer = PAYERS[Math.floor(Math.random() * PAYERS.length)];
  const aiResolved = Math.random() < (eligiblePct * accuracyPct);
  const confidence = aiResolved ? 85 + Math.random() * 13 : 85 + Math.random() * 10;
  let status: EventStatus;
  if (aiResolved) {
    status = Math.random() > 0.3 ? "ai-routed" : "resolved";
  } else {
    status = Math.random() > 0.5 ? "escalated" : "in-progress";
  }
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    callerType, reason, payer, status,
    aiConfidence: Math.round(confidence),
    resolutionTimeSec: aiResolved ? 2 + Math.random() * 5 : 30 + Math.random() * 60,
  };
}

function generateClaimsEvent(): ClaimsEvent {
  const rand = Math.random();
  const isAuto = rand < 0.6;
  const isException = rand > 0.9;
  return {
    id: `clm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    claimId: CLAIM_IDS(),
    type: CLAIMS_TYPES[Math.floor(Math.random() * CLAIMS_TYPES.length)],
    confidence: isAuto ? 88 + Math.random() * 10 : 85 + Math.random() * 10,
    adjudicationTimeSec: isAuto ? 1 + Math.random() * 4 : 15 + Math.random() * 45,
    manualReviewAvoided: isAuto,
    status: isException ? "exception" : isAuto ? "auto" : "manual",
  };
}

function generateNetworkEvent(): NetworkEvent {
  return {
    id: `net-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    type: NETWORK_TYPES[Math.floor(Math.random() * NETWORK_TYPES.length)],
    savings: Math.round(50 + Math.random() * 500),
    network: NETWORKS[Math.floor(Math.random() * NETWORKS.length)],
    planImpact: PLAN_IMPACTS[Math.floor(Math.random() * PLAN_IMPACTS.length)],
    memberImpact: MEMBER_IMPACTS[Math.floor(Math.random() * MEMBER_IMPACTS.length)],
  };
}

function generateROIEvent(totalSavings: number): ROIEvent {
  return {
    id: `roi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
    type: ROI_TYPES[Math.floor(Math.random() * ROI_TYPES.length)],
    value: Math.round(100 + Math.random() * 2000),
    detail: `Cumulative: $${Math.round(totalSavings).toLocaleString()}`,
  };
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const { preset, callParams, mode } = useDashboard();
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [claimsEvents, setClaimsEvents] = useState<ClaimsEvent[]>([]);
  const [networkEvents, setNetworkEvents] = useState<NetworkEvent[]>([]);
  const [roiEvents, setRoiEvents] = useState<ROIEvent[]>([]);

  const [pipeline, setPipeline] = useState<PipelineState>({ activeStage: 0, confidence: 92, resolutionTime: 4.2, outcome: "Deflected" });
  const [claimsPipeline, setClaimsPipeline] = useState<PipelineState>({ activeStage: 0, confidence: 94, resolutionTime: 2.1, outcome: "Auto-Adjudicated" });
  const [networkPipeline, setNetworkPipeline] = useState<PipelineState>({ activeStage: 0, confidence: 89, resolutionTime: 1.8, outcome: "Optimized" });
  const [roiPipeline, setRoiPipeline] = useState<PipelineState>({ activeStage: 0, confidence: 96, resolutionTime: 0.5, outcome: "Attributed" });

  const [counters, setCounters] = useState({ callsDeflected: 0, manualMinutesSaved: 0, costAvoided: 0, fteEquivalent: 0 });
  const [claimsCounters, setClaimsCounters] = useState({ autoAdjudicated: 0, manualReviewsAvoided: 0, cycleTimeReductionPct: 42, errorRateReductionPct: 67, costAvoided: 0, fteImpact: 0 });
  const [networkCounters, setNetworkCounters] = useState({ savingsGenerated: 0, oonAvoidanceRate: 78, marketplaceUtilLift: 23, pmpmReduction: 0, memberDisruptionReductionPct: 91 });
  const [roiCounters, setRoiCounters] = useState({ totalAnnualizedSavings: 0, roiMultiple: 0, paybackMonths: 8.2, productivityLiftPct: 34, marginExpansionPct: 0 });

  const callCount = useRef(0);
  const pipelineTimer = useRef<ReturnType<typeof setTimeout>>();

  const intervalMs = preset === "low" ? 7000 : preset === "medium" ? 5000 : 3000;

  const animatePipeline = useCallback((setter: React.Dispatch<React.SetStateAction<PipelineState>>, conf: number, time: number, outcome: string) => {
    let i = 0;
    const step = () => {
      if (i <= 5) {
        setter({ activeStage: i, confidence: conf, resolutionTime: time, outcome });
        i++;
        pipelineTimer.current = setTimeout(step, 300);
      }
    };
    step();
  }, []);

  useEffect(() => {
    if (mode !== "tpa-demo" && mode !== "internal") return;

    const timer = setInterval(() => {
      // Contact events
      const event = generateEvent(callParams.eligiblePct, callParams.accuracyPct);
      setEvents(prev => [event, ...prev].slice(0, 50));
      animatePipeline(setPipeline, event.aiConfidence, parseFloat(event.resolutionTimeSec.toFixed(1)),
        event.status === "ai-routed" || event.status === "resolved" ? "Deflected" : "Escalated");

      const isDeflected = event.status === "ai-routed" || event.status === "resolved";
      if (isDeflected) {
        const minutesSaved = callParams.handleTimeMin * 0.75; // proportion of time saved per deflected call
        const costSaved = (callParams.handleTimeMin / 60) * callParams.agentCostHr * 0.75;
        setCounters(prev => ({
          callsDeflected: prev.callsDeflected + 1,
          manualMinutesSaved: prev.manualMinutesSaved + minutesSaved,
          costAvoided: prev.costAvoided + costSaved,
          fteEquivalent: (prev.callsDeflected + 1) * minutesSaved / (8 * 60),
        }));
      }

      // Claims events
      const claimsEvt = generateClaimsEvent();
      setClaimsEvents(prev => [claimsEvt, ...prev].slice(0, 50));
      animatePipeline(setClaimsPipeline, Math.round(claimsEvt.confidence), parseFloat(claimsEvt.adjudicationTimeSec.toFixed(1)),
        claimsEvt.status === "auto" ? "Auto-Adjudicated" : claimsEvt.status === "exception" ? "Exception" : "Manual Review");

      if (claimsEvt.manualReviewAvoided) {
        const claimCostSaved = (claimsEvt.adjudicationTimeSec / 60) * 50; // $50/hr FTE cost from source model
        setClaimsCounters(prev => ({
          ...prev,
          autoAdjudicated: prev.autoAdjudicated + 1,
          manualReviewsAvoided: prev.manualReviewsAvoided + 1,
          costAvoided: prev.costAvoided + claimCostSaved,
          fteImpact: (prev.autoAdjudicated + 1) * 15 / (8 * 60), // 15 min per claim from source model
        }));
      }

      // Network events
      const netEvt = generateNetworkEvent();
      setNetworkEvents(prev => [netEvt, ...prev].slice(0, 50));
      animatePipeline(setNetworkPipeline, 85 + Math.round(Math.random() * 12), parseFloat((1 + Math.random() * 3).toFixed(1)), "Optimized");
      setNetworkCounters(prev => ({
        ...prev,
        savingsGenerated: prev.savingsGenerated + netEvt.savings,
        pmpmReduction: parseFloat(((prev.savingsGenerated + netEvt.savings) / 10000).toFixed(2)),
      }));

      // ROI events (less frequent)
      if (Math.random() > 0.4) {
        setRoiCounters(prev => {
          const totalSavings = counters.costAvoided + claimsCounters.costAvoided + networkCounters.savingsGenerated;
          const roiEvt = generateROIEvent(totalSavings);
          setRoiEvents(prev2 => [roiEvt, ...prev2].slice(0, 50));
          animatePipeline(setRoiPipeline, 96, 0.5, "Attributed");
          const annualized = totalSavings * 52; // weekly extrapolation, more conservative
          return {
            ...prev,
            totalAnnualizedSavings: annualized,
            roiMultiple: annualized > 0 ? parseFloat((annualized / 350000).toFixed(1)) : 0,
            marginExpansionPct: parseFloat((annualized / 5000000 * 100).toFixed(2)),
          };
        });
      }

      callCount.current += 1;
    }, intervalMs);

    return () => {
      clearInterval(timer);
      if (pipelineTimer.current) clearTimeout(pipelineTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, intervalMs, callParams, animatePipeline]);

  return (
    <SimulationContext.Provider value={{
      events, claimsEvents, networkEvents, roiEvents,
      pipeline, claimsPipeline, networkPipeline, roiPipeline,
      counters, claimsCounters, networkCounters, roiCounters,
      isRunning: true,
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}
