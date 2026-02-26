import { DetailModal } from "./DetailModal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Props {
  metric: string | null;
  onClose: () => void;
}

const METRIC_DATA: Record<string, { title: string; preAI: number; postAI: number; unit: string; trendData: { period: string; value: number }[] }> = {
  "Avg Handle Time": {
    title: "Average Handle Time",
    preAI: 8.0,
    postAI: 2.8,
    unit: "min",
    trendData: [
      { period: "Week 1", value: 7.8 }, { period: "Week 2", value: 6.2 },
      { period: "Week 3", value: 4.5 }, { period: "Week 4", value: 2.8 },
    ],
  },
  "AI Assist Rate": {
    title: "AI Assist Rate",
    preAI: 0,
    postAI: 87,
    unit: "%",
    trendData: [
      { period: "Week 1", value: 45 }, { period: "Week 2", value: 62 },
      { period: "Week 3", value: 78 }, { period: "Week 4", value: 87 },
    ],
  },
  "Escalation Alerts": {
    title: "Escalation Count",
    preAI: 145,
    postAI: 32,
    unit: "",
    trendData: [
      { period: "Week 1", value: 120 }, { period: "Week 2", value: 85 },
      { period: "Week 3", value: 52 }, { period: "Week 4", value: 32 },
    ],
  },
  "SLA Improvement": {
    title: "SLA Compliance",
    preAI: 72,
    postAI: 95,
    unit: "%",
    trendData: [
      { period: "Week 1", value: 76 }, { period: "Week 2", value: 83 },
      { period: "Week 3", value: 90 }, { period: "Week 4", value: 95 },
    ],
  },
  "Live Queue": {
    title: "Live Queue Depth",
    preAI: 24,
    postAI: 8,
    unit: "",
    trendData: [
      { period: "Week 1", value: 22 }, { period: "Week 2", value: 16 },
      { period: "Week 3", value: 11 }, { period: "Week 4", value: 8 },
    ],
  },
  "Workforce Impact": {
    title: "Workforce Reduction",
    preAI: 0,
    postAI: 4.2,
    unit: " FTE",
    trendData: [
      { period: "Week 1", value: 1.0 }, { period: "Week 2", value: 2.1 },
      { period: "Week 3", value: 3.2 }, { period: "Week 4", value: 4.2 },
    ],
  },
};

export function SupervisorMetricModal({ metric, onClose }: Props) {
  if (!metric) return null;
  const data = METRIC_DATA[metric] || METRIC_DATA["AI Assist Rate"];

  const comparisonData = [
    { label: "Pre-AI", value: data.preAI },
    { label: "Post-AI", value: data.postAI },
  ];

  return (
    <DetailModal open title={data.title} onClose={onClose}>
      <div className="space-y-4">
        {/* Pre vs Post */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border text-center">
            <span className="text-[9px] text-muted-foreground uppercase block">Pre-AI</span>
            <span className="text-xl font-bold font-mono text-muted-foreground">{data.preAI}{data.unit}</span>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <span className="text-[9px] text-muted-foreground uppercase block">Post-AI</span>
            <span className="text-xl font-bold font-mono text-primary">{data.postAI}{data.unit}</span>
          </div>
        </div>

        {/* Trend chart */}
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trendData}>
              <XAxis dataKey="period" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.trendData.map((_, i) => (
                  <Cell key={i} fill={`hsl(210, 100%, ${50 + i * 5}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DetailModal>
  );
}
