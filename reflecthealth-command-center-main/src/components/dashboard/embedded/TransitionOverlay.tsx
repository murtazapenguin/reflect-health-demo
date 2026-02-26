import { useEffect, useState } from "react";
import type { DeploymentMode } from "@/contexts/DashboardContext";

interface TransitionOverlayProps {
  mode: DeploymentMode;
  visible: boolean;
}

const messages: Record<DeploymentMode, string> = {
  "white-label": "Deploy as your branded intelligence layer.",
  "embedded": "Or embed directly inside your existing Five9 workflow.",
  "opyn": "Embedded AI orchestration for member & provider portals.",
};

export function TransitionOverlay({ mode, visible }: TransitionOverlayProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, mode]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
      <div className="bg-card/95 backdrop-blur-md rounded-xl px-8 py-5 shadow-2xl border border-border animate-scale-in">
        <p className="text-sm font-semibold text-foreground text-center max-w-sm">
          {messages[mode]}
        </p>
      </div>
    </div>
  );
}
