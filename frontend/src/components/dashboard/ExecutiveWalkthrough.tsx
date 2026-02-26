import { useState, useEffect, useCallback } from "react";
import { Play, X } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { fmtCurrency, fmtDecimal } from "@/lib/format";

const WALKTHROUGH_STEPS = [
  { target: "total-savings", duration: 8000 },
  { target: "roi-multiple", duration: 8000 },
  { target: "payback-period", duration: 8000 },
  { target: "fte-reduction", duration: 8000 },
  { target: "savings-chart", duration: 10000 },
];

export function ExecutiveWalkthroughButton() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const { results, callParams } = useDashboard();
  const { combined, callCenter, claims } = results;

  const startWalkthrough = useCallback(async () => {
    setIsPlaying(true);
    setStep(0);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: `Reflect AI delivers ${fmtDecimal(combined.roi)}x return on investment with a ${fmtDecimal(combined.paybackMonths)} month payback period. Annual savings of ${fmtCurrency(combined.totalAnnualSavings)} are achieved through intelligent call deflection and claims automation, reducing ${fmtDecimal(callCenter.fteSaved + claims.fteSaved)} full-time equivalents while maintaining ${Math.round(callParams.accuracyPct * 100)}% accuracy.`,
            voiceId: "onwK4e9ZLuTAKqWW03F9",
          }),
        }
      );

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = 0.5;
        await audio.play();
      }
    } catch (err) {
      console.warn("Narration audio error:", err);
    }
  }, [combined, callCenter, claims, callParams]);

  useEffect(() => {
    if (!isPlaying) return;
    if (step >= WALKTHROUGH_STEPS.length) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setStep(s => s + 1);
    }, WALKTHROUGH_STEPS[step].duration);

    const el = document.getElementById(WALKTHROUGH_STEPS[step].target);
    if (el) {
      el.classList.add("savings-pulse", "ring-2", "ring-primary/50", "rounded-lg");
      return () => {
        el.classList.remove("savings-pulse", "ring-2", "ring-primary/50", "rounded-lg");
        clearTimeout(timer);
      };
    }

    return () => clearTimeout(timer);
  }, [isPlaying, step]);

  return (
    <>
      <button
        onClick={startWalkthrough}
        disabled={isPlaying}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md reflect-gradient text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        <Play className="h-3 w-3" />
        {isPlaying ? `Step ${step + 1}/${WALKTHROUGH_STEPS.length}` : "Play Executive Walkthrough"}
      </button>
      {isPlaying && (
        <button onClick={() => setIsPlaying(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );
}
