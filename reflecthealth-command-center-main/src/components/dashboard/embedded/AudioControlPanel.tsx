import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { Volume2, VolumeX, RotateCcw, Gauge } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export function AudioControlPanel() {
  const {
    isMuted, setIsMuted,
    playbackSpeed, setPlaybackSpeed,
    confidenceThreshold, setConfidenceThreshold,
    isPlaying, stopAudio,
  } = useAudioEngine();

  const speeds = [1, 1.25];

  return (
    <div className="five9-card p-2.5 space-y-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-five9-muted">
        Audio Controls
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-1.5 rounded transition-colors ${isMuted ? "bg-red-500/10 text-red-500" : "bg-secondary text-foreground"}`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
        </button>
        <button
          onClick={stopAudio}
          disabled={!isPlaying}
          className="p-1.5 rounded bg-secondary text-foreground disabled:opacity-30 transition-colors"
          title="Replay"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-1 ml-2">
          <Gauge className="h-3 w-3 text-five9-muted" />
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors ${
                playbackSpeed === s ? "five9-accent-bg text-white" : "bg-secondary text-five9-muted"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-five9-muted">Confidence Threshold</span>
          <span className="text-[9px] font-mono text-foreground font-semibold">{confidenceThreshold}%</span>
        </div>
        <Slider
          value={[confidenceThreshold]}
          onValueChange={([v]) => setConfidenceThreshold(v)}
          min={50}
          max={99}
          step={1}
          className="w-full"
        />
      </div>
    </div>
  );
}
