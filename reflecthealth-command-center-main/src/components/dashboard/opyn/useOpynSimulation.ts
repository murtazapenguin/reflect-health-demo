import { useState, useCallback } from "react";

/* ─── Random Helpers ─── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min: number, max: number, decimals = 0) {
  return +(Math.random() * (max - min) + min).toFixed(decimals);
}

/* ─── Data Pools ─── */
const FIRST_NAMES = ["Sarah", "James", "Priya", "Brian", "Anita", "Ewan", "Callum", "Elena", "David", "Rachel"];
const LAST_NAMES = ["Martinez", "Patel", "Benz", "Fraser", "Kim", "Chen", "Okafor", "Ross", "Malhotra", "Reeves"];
const FACILITIES_IN = [
  "Valley Orthopedic Center", "Northgate Orthopedic Surgery", "Summit Joint Institute",
  "Lakeview Surgical Partners", "Essex Bone and Joint", "Midwest Orthopedic Surgery",
];
const FACILITIES_OUT = [
  "OakView Orthopedic", "Premier Specialty Surgery", "Capital Bone & Joint",
  "Westside Surgical Group", "Highland Orthopedic Clinic",
];
const STREETS = ["River Road", "Mountain Way", "Bishop Lane", "Health Blvd", "Summit Dr", "Oak Avenue", "Main Street", "Elm Street"];
const CITIES_IN = ["Essex, CT 06409", "Colorado Springs, CO 80920", "Denver, CO 80202", "Hartford, CT 06103"];
const CITIES_OUT = ["Old Saybrook, CT 06475", "Boulder, CO 80302", "Stamford, CT 06901", "New Haven, CT 06510"];

const PLAN_TIERS = [
  { name: "Gold PPO", coinsurance: 0.20, deductible: 2500, oopMax: 8000 },
  { name: "Silver PPO", coinsurance: 0.30, deductible: 3500, oopMax: 10000 },
  { name: "Bronze PPO", coinsurance: 0.40, deductible: 5000, oopMax: 12000 },
  { name: "Platinum PPO", coinsurance: 0.10, deductible: 1500, oopMax: 6000 },
];

export type EdgeCaseOpyn = "none" | "no_in_network_nearby" | "prior_auth_required" | "high_deductible" | "pending_review";

export interface ProviderData {
  name: string;
  facility: string;
  rating: number;
  distance: number;
  address: string;
  city: string;
}

export interface OpynSimSession {
  planTier: string;
  planNetwork: string;
  deductibleTotal: number;
  deductibleRemaining: number;
  coinsurance: number;
  oopMax: number;
  oopMet: number;

  inNetworkProvider: ProviderData;
  outOfNetworkProvider: ProviderData;

  procedureCost: number;
  negotiatedRate: number;
  inNetworkYouPay: number;
  outOfNetworkTotal: number;
  outOfNetworkPlanPays: number;
  outOfNetworkYouPay: number;

  edgeCase: EdgeCaseOpyn;
}

export type SimPhase =
  | "idle"
  | "intent_detected"
  | "plan_loaded"
  | "provider_search"
  | "searching_providers"
  | "cost_engine"
  | "compliance"
  | "recommendation"
  | "done"
  | "edge_prior_auth"
  | "edge_no_provider"
  | "edge_pending_review";

function generateProvider(isInNetwork: boolean): ProviderData {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  return {
    name: `${last}, ${first}, MD`,
    facility: pick(isInNetwork ? FACILITIES_IN : FACILITIES_OUT),
    rating: isInNetwork ? randFloat(3, 4, 1) : randFloat(2, 3.5, 1),
    distance: isInNetwork ? randInt(2, 15) : randInt(18, 40),
    address: `${randInt(10, 1600)} ${pick(STREETS)}`,
    city: pick(isInNetwork ? CITIES_IN : CITIES_OUT),
  };
}

function computeYouPay(procedureCost: number, negotiatedRate: number, deductibleRemaining: number, coinsurance: number, oopMax: number, oopMet: number): number {
  const afterNegotiation = negotiatedRate;
  const deductibleApplied = Math.min(deductibleRemaining, afterNegotiation);
  const afterDeductible = afterNegotiation - deductibleApplied;
  const coinsuranceAmount = afterDeductible * coinsurance;
  const totalBeforeCap = deductibleApplied + coinsuranceAmount;
  const remainingOop = oopMax - oopMet;
  return Math.min(totalBeforeCap, remainingOop);
}

export function generateSession(): OpynSimSession {
  const plan = pick(PLAN_TIERS);
  const deductibleMet = randFloat(0, plan.deductible * 0.8, 2);
  const deductibleRemaining = +(plan.deductible - deductibleMet).toFixed(2);
  const oopMet = randFloat(0, plan.oopMax * 0.15, 2);

  const procedureCost = randInt(30000, 45000);
  const negotiatedRate = Math.round(procedureCost * randFloat(0.65, 0.82, 2));

  const inNetworkYouPay = Math.round(computeYouPay(procedureCost, negotiatedRate, deductibleRemaining, plan.coinsurance, plan.oopMax, oopMet));

  const outOfNetworkTotal = randInt(48000, 62000);
  const ucrRate = 0.6;
  const outOfNetworkPlanPays = Math.round(outOfNetworkTotal * ucrRate * 0.35);
  const outOfNetworkYouPay = outOfNetworkTotal - outOfNetworkPlanPays;

  // Edge cases: ~25% chance
  let edgeCase: EdgeCaseOpyn = "none";
  const roll = Math.random();
  if (roll < 0.08) edgeCase = "no_in_network_nearby";
  else if (roll < 0.16) edgeCase = "prior_auth_required";
  else if (roll < 0.22) edgeCase = "high_deductible";
  else if (roll < 0.26) edgeCase = "pending_review";

  return {
    planTier: plan.name,
    planNetwork: "First Health",
    deductibleTotal: plan.deductible,
    deductibleRemaining,
    coinsurance: plan.coinsurance,
    oopMax: plan.oopMax,
    oopMet,
    inNetworkProvider: generateProvider(true),
    outOfNetworkProvider: generateProvider(false),
    procedureCost,
    negotiatedRate,
    inNetworkYouPay,
    outOfNetworkTotal,
    outOfNetworkPlanPays,
    outOfNetworkYouPay,
    edgeCase,
  };
}

export function buildSimMessages(s: OpynSimSession) {
  const fmtD = (n: number) => `$${n.toLocaleString()}`;
  const provName = s.inNetworkProvider.name.split(",").slice(0, 2).join(",");
  const edgeExtra = s.edgeCase === "prior_auth_required"
    ? " Note: this procedure requires prior authorization, which I've already initiated."
    : s.edgeCase === "no_in_network_nearby"
    ? ` Note: the closest in-network provider is ${s.inNetworkProvider.distance} miles away.`
    : s.edgeCase === "high_deductible"
    ? ` Keep in mind your deductible remaining is ${fmtD(s.deductibleRemaining)}.`
    : s.edgeCase === "pending_review"
    ? " The cost estimate is pending medical review and may be adjusted."
    : "";

  return [
    { role: "member" as const, text: "I need a knee replacement. Can you help me understand costs?", delay: 0 },
    { role: "ai" as const, text: `Absolutely! I'm pulling your ${s.planTier} plan details and checking in-network providers now…`, delay: 1400 },
    { role: "member" as const, text: `Is Dr. ${provName.split(",")[0].trim()} in my network?`, delay: 3200 },
    { role: "ai" as const, text: `Yes! ${provName} at ${s.inNetworkProvider.facility} is in-network with a ${s.inNetworkProvider.rating}★ rating, ${s.inNetworkProvider.distance} miles from you.`, delay: 4800 },
    { role: "member" as const, text: "What's my out-of-pocket going to be?", delay: 7000 },
    { role: "ai" as const, text: `Based on your remaining deductible of ${fmtD(s.deductibleRemaining)} and ${Math.round(s.coinsurance * 100)}% coinsurance, your estimated out-of-pocket for in-network is ~${fmtD(s.inNetworkYouPay)}. You'll hit your OOP max at ${fmtD(s.oopMax)}.${edgeExtra} Want me to schedule a consultation?`, delay: 8800 },
  ];
}

export function buildPipelineStages(s: OpynSimSession) {
  const stages = [
    { label: "Intent Detected", value: "Benefit Inquiry → Cost Estimation", delay: 800 },
    { label: "Plan Loaded", value: `${s.planTier} — Active`, delay: 1600 },
    { label: "Provider Search", value: "In-Network Match Found", delay: 3600 },
    { label: "Cost Engine", value: "Accumulator + Coinsurance Calculated", delay: 7400 },
    { label: "Compliance", value: "HIPAA Verified • PHI Access Logged", delay: 8000 },
    { label: "Recommendation", value: "Schedule CTA Generated", delay: 9200 },
  ];

  if (s.edgeCase === "prior_auth_required") {
    stages.splice(4, 0, { label: "Prior Authorization", value: "PA Required — Auto-Initiated", delay: 7700 });
  }
  if (s.edgeCase === "pending_review") {
    stages.splice(4, 0, { label: "Medical Review", value: "Cost Estimate Pending Review", delay: 7700 });
  }
  if (s.edgeCase === "no_in_network_nearby") {
    stages[2] = { ...stages[2], value: `Nearest In-Network: ${s.inNetworkProvider.distance} mi` };
  }

  return stages;
}

export function useOpynSimulation() {
  const [session, setSession] = useState<OpynSimSession | null>(null);
  const [phase, setPhase] = useState<SimPhase>("idle");

  const startSimulation = useCallback(() => {
    const s = generateSession();
    setSession(s);
    setPhase("intent_detected");
    return s;
  }, []);

  const resetSimulation = useCallback(() => {
    setSession(null);
    setPhase("idle");
  }, []);

  return { session, phase, setPhase, startSimulation, resetSimulation };
}
