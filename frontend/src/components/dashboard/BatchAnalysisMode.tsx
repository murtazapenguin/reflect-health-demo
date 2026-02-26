import { useState, useCallback, useRef } from "react";
import { Upload, FileAudio, Loader2, CheckCircle2, TrendingUp, DollarSign, BarChart3, AlertTriangle, XCircle, HelpCircle, X } from "lucide-react";

interface BatchResult {
  fileName: string;
  score: number;
  tier: string;
  callType: string;
  intent: string;
  costReductionPct: number;
}

interface BatchStats {
  avgScore: number;
  fullyAutomatable: number;
  hybrid: number;
  aiPrepHuman: number;
  humanRequired: number;
  annualSavings: number;
  topCandidates: BatchResult[];
}

function tierColor(tier: string) {
  if (tier === "Fully Automatable") return { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2 };
  if (tier === "Hybrid AI + Human Assist") return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: HelpCircle };
  if (tier === "AI Prep + Human Resolution") return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: AlertTriangle };
  return { bg: "bg-red-50", text: "text-destructive", border: "border-red-200", icon: XCircle };
}

function HeatmapBar({ results }: { results: BatchResult[] }) {
  const sorted = [...results].sort((a, b) => b.score - a.score);
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold text-foreground mb-2">Automation Opportunity Heatmap</div>
      <div className="flex flex-col gap-0.5">
        {sorted.map((r, i) => {
          const pct = r.score;
          const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-amber-500" : "bg-destructive";
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-32 truncate text-[9px] text-muted-foreground shrink-0">{r.callType || r.fileName.replace(/\.(mp3|wav|m4a|ogg|flac|webm)$/i, "")}</div>
              <div className="flex-1 h-3 bg-secondary rounded overflow-hidden">
                <div className={`h-full rounded transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="w-8 text-right text-[9px] font-mono font-semibold text-foreground shrink-0">{pct}</div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[8px] text-muted-foreground mt-1 px-34">
        <span>← Human Required</span>
        <span>Fully Automatable →</span>
      </div>
    </div>
  );
}

function computeStats(results: BatchResult[], monthlyCalls: number): BatchStats {
  const n = results.length;
  if (n === 0) return { avgScore: 0, fullyAutomatable: 0, hybrid: 0, aiPrepHuman: 0, humanRequired: 0, annualSavings: 0, topCandidates: [] };
  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / n);
  const fullyAutomatable = results.filter(r => r.tier === "Fully Automatable").length;
  const hybrid = results.filter(r => r.tier === "Hybrid AI + Human Assist").length;
  const aiPrepHuman = results.filter(r => r.tier === "AI Prep + Human Resolution").length;
  const humanRequired = results.filter(r => r.tier === "Human Required").length;

  // Weighted savings model
  const annualSavings = results.reduce((sum, r) => {
    const callsForType = monthlyCalls / n;
    const savingsPct = r.tier === "Fully Automatable" ? 0.856 :
      r.tier === "Hybrid AI + Human Assist" ? r.costReductionPct / 100 :
      r.tier === "AI Prep + Human Resolution" ? 0.3 : 0;
    return sum + (4.50 * savingsPct * callsForType * 12);
  }, 0);

  const topCandidates = [...results].sort((a, b) => b.score - a.score).slice(0, 10);
  return { avgScore, fullyAutomatable, hybrid, aiPrepHuman, humanRequired, annualSavings, topCandidates };
}

interface BatchAnalysisModeProps {
  onClose: () => void;
  monthlyCalls?: number;
}

export function BatchAnalysisMode({ onClose, monthlyCalls = 5000 }: BatchAnalysisModeProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [done, setDone] = useState(false);
  const abortRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...newFiles.filter(f => !existing.has(f.name))];
    });
    setResults([]);
    setDone(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|flac|webm)$/i.test(f.name)));
  }, [handleFiles]);

  const runBatch = useCallback(async () => {
    if (!files.length) return;
    abortRef.current = false;
    setProcessing(true);
    setCurrentIdx(0);
    setResults([]);
    setDone(false);

    const batchResults: BatchResult[] = [];

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break;
      setCurrentIdx(i);
      const file = files[i];

      try {
        // Transcribe
        const form = new FormData();
        form.append("audio", file);
        let transcript = "";
        const sttRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-call`, {
          method: "POST",
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: form,
        });
        if (sttRes.ok) {
          const d = await sttRes.json();
          transcript = d.transcript || d.raw_text || "";
        }

        // Analyze
        if (transcript) {
          const aRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-call`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ transcript, fileName: file.name, durationSeconds: Math.round(file.size / 16000) }),
          });
          if (aRes.ok) {
            const { analysis } = await aRes.json();
            batchResults.push({
              fileName: file.name,
              score: analysis.automation_feasibility_score ?? 50,
              tier: analysis.scoring_breakdown?.automation_tier ?? "Hybrid AI + Human Assist",
              callType: analysis.call_type ?? "Unknown",
              intent: analysis.intent ?? "",
              costReductionPct: analysis.scoring_breakdown?.estimated_cost_reduction_pct ?? 50,
            });
            setResults([...batchResults]);
          }
        }
      } catch {
        // Skip failed files
      }
      await new Promise(r => setTimeout(r, 200)); // rate limit buffer
    }

    setProcessing(false);
    setDone(true);
  }, [files]);

  const stats = computeStats(results, monthlyCalls);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Batch Analysis Mode — Multi-Recording Intelligence</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Drop zone */}
        {!processing && !done && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-6 text-center cursor-pointer transition-colors bg-secondary/10 hover:bg-secondary/20"
          >
            <input ref={fileInputRef} type="file" multiple accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm"
              className="hidden" onChange={e => handleFiles(Array.from(e.target.files || []))} />
            <FileAudio className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-medium text-foreground">Drop 50+ call recordings here</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">MP3, WAV, M4A · Batch processing with aggregate scoring</p>
          </div>
        )}

        {/* File queue */}
        {files.length > 0 && !done && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold text-foreground">{files.length} Files Queued</div>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
              {files.map((f, i) => {
                const result = results[i];
                return (
                  <div key={f.name} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[9px] ${
                    result ? "border-emerald-200 bg-emerald-50/50" :
                    i === currentIdx && processing ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"
                  }`}>
                    {result ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 shrink-0" /> :
                      i === currentIdx && processing ? <Loader2 className="h-2.5 w-2.5 animate-spin text-primary shrink-0" /> :
                      <FileAudio className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                    <span className="flex-1 truncate text-foreground">{f.name}</span>
                    {result && <span className="font-mono font-bold text-primary shrink-0">{result.score}/100</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Processing progress */}
        {processing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin text-primary" /> Analyzing {files[currentIdx]?.name}…</span>
              <span className="font-mono text-primary">{results.length}/{files.length}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(results.length / files.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Run button */}
        {files.length > 0 && !processing && !done && (
          <button onClick={runBatch}
            className="w-full py-2.5 rounded-lg reflect-gradient text-white text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <BarChart3 className="h-3.5 w-3.5" />
            Analyze {files.length} Recordings
          </button>
        )}

        {/* Results */}
        {done && results.length > 0 && (
          <div className="space-y-4">
            {/* Aggregate stats */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { v: stats.avgScore, l: "Avg Score", c: "text-primary" },
                { v: `${Math.round((stats.fullyAutomatable / results.length) * 100)}%`, l: "Fully Automatable", c: "text-emerald-600" },
                { v: `${Math.round((stats.hybrid / results.length) * 100)}%`, l: "Hybrid", c: "text-blue-600" },
                { v: `${Math.round((stats.humanRequired / results.length) * 100)}%`, l: "Human Required", c: "text-destructive" },
              ].map(({ v, l, c }) => (
                <div key={l} className="rounded-md bg-secondary/30 p-2.5 text-center border border-border/50">
                  <div className={`text-sm font-bold font-mono ${c}`}>{v}</div>
                  <div className="text-[8px] text-muted-foreground uppercase mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            {/* Tier breakdown */}
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="text-[10px] font-semibold text-foreground">Distribution by Automation Tier</div>
              {[
                { label: "✅ Fully Automatable", count: stats.fullyAutomatable, color: "bg-emerald-500" },
                { label: "⚙ Hybrid AI + Human Assist", count: stats.hybrid, color: "bg-blue-500" },
                { label: "👩‍💼 AI Prep + Human Resolution", count: stats.aiPrepHuman, color: "bg-amber-500" },
                { label: "❌ Human Required", count: stats.humanRequired, color: "bg-destructive" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground w-44 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${results.length ? (count / results.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[9px] font-mono font-semibold text-foreground w-6 text-right">{count}</span>
                </div>
              ))}
            </div>

            {/* Heatmap */}
            <div className="rounded-md border border-border p-3">
              <HeatmapBar results={results} />
            </div>

            {/* Annual savings */}
            <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-[10px] font-semibold text-emerald-800">Estimated Annual Savings</div>
                <div className="text-xl font-bold text-emerald-700 font-mono">${(stats.annualSavings / 1000).toFixed(0)}K</div>
                <div className="text-[9px] text-emerald-600">Based on {monthlyCalls.toLocaleString()} calls/mo across {results.length} call types</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-[9px] text-emerald-700 font-semibold">Headcount Impact</div>
                <div className="text-sm font-bold text-emerald-800">{Math.round(stats.annualSavings / (23 * 8 * 260))}<span className="text-[9px] font-normal"> FTE equiv.</span></div>
              </div>
            </div>

            {/* Top 10 candidates */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-3 w-3 text-primary" /> Top Automation Candidates
              </div>
              {stats.topCandidates.map((r, i) => {
                const tc = tierColor(r.tier);
                const Icon = tc.icon;
                return (
                  <div key={r.fileName} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${tc.border} ${tc.bg}`}>
                    <span className="text-[9px] text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                    <Icon className={`h-2.5 w-2.5 ${tc.text} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[9px] font-semibold ${tc.text} truncate`}>{r.callType}</div>
                      <div className="text-[8px] text-muted-foreground truncate">{r.intent}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[10px] font-bold font-mono ${tc.text}`}>{r.score}</div>
                      <div className="text-[8px] text-muted-foreground">/ 100</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reset */}
            <button onClick={() => { setFiles([]); setResults([]); setDone(false); }}
              className="w-full py-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors flex items-center justify-center gap-1.5">
              <Upload className="h-3 w-3" /> Upload New Batch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
