import { useState } from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ChevronDown, Server, Database, Users, Phone, Briefcase, Globe, FileText, ShieldCheck, CheckCircle } from "lucide-react";

const SYSTEMS = [
  { name: "Core Claims Engine", icon: Server, status: "Connected" },
  { name: "Eligibility Database", icon: Database, status: "Connected" },
  { name: "Provider Directory", icon: Users, status: "Connected" },
  { name: "Contact Center Platform (CCaaS / VoIP)", icon: Phone, status: "Connected" },
  { name: "CRM", icon: Briefcase, status: "Connected" },
  { name: "Member Portal", icon: Globe, status: "Connected" },
  { name: "Document Management System", icon: FileText, status: "Connected" },
  { name: "Fraud Detection System", icon: ShieldCheck, status: "Connected" },
];

export function ConnectedSystemsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
        <div className="flex items-center gap-2">
          <Server className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Connected Systems</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{SYSTEMS.length} Active</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-lg border border-border bg-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {SYSTEMS.map((sys) => {
              const Icon = sys.icon;
              return (
                <div key={sys.name} className="flex items-center gap-2.5 px-3 py-2 rounded border border-border bg-card">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-[10px] font-medium text-foreground flex-1">{sys.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    <span className="text-[9px] text-emerald-600 font-medium">{sys.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
