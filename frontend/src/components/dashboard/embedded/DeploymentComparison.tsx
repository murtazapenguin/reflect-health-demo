import { X } from "lucide-react";

interface DeploymentComparisonProps {
  open: boolean;
  onClose: () => void;
}

const rows = [
  { feature: "Branding", whiteLabel: "Full Reflect branding", embedded: "Five9 native UI" },
  { feature: "View", whiteLabel: "Executive dashboard", embedded: "Agent assist overlay" },
  { feature: "Positioning", whiteLabel: "Standalone ops command center", embedded: "In-workflow augmentation" },
  { feature: "Strategy", whiteLabel: "Infrastructure positioning", embedded: "Workflow acceleration" },
  { feature: "Control", whiteLabel: "Custom UX control", embedded: "Faster go-live" },
];

export function DeploymentComparison({ open, onClose }: DeploymentComparisonProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg border border-border animate-scale-in">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Deployment Comparison</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Feature</th>
                <th className="text-left py-2 text-primary font-semibold">White-Label</th>
                <th className="text-left py-2 text-five9-accent font-semibold">Embedded</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{row.feature}</td>
                  <td className="py-2 text-foreground">{row.whiteLabel}</td>
                  <td className="py-2 text-foreground">{row.embedded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
