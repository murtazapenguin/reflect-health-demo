import penguinLogo from "@/assets/penguin-ai-logo.png";

export function DashboardFooter() {
  return (
    <footer className="border-t border-border bg-card px-5 py-2 flex items-center justify-end gap-3">
      <span className="text-[10px] text-muted-foreground">
        Reflect Health © 2026
      </span>
      <img src={penguinLogo} alt="Powered by Penguin AI" className="h-3 opacity-30" />
    </footer>
  );
}
