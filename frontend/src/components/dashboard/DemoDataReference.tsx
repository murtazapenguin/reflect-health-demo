import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  UserCheck,
  Users,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
    </button>
  );
}

function Mono({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <code className="bg-secondary px-1.5 py-0.5 rounded text-[11px] font-mono">{children}</code>
      <CopyButton text={children} />
    </span>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        {icon}
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

function ScenarioCard({
  number,
  title,
  badge,
  children,
}: {
  number: number;
  title: string;
  badge?: { label: string; className: string };
  children: React.ReactNode;
}) {
  return (
    <div className="bg-secondary/30 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
          {number}
        </span>
        <span className="text-[11px] font-semibold text-foreground">{title}</span>
        {badge && (
          <Badge variant="secondary" className={`text-[9px] ${badge.className}`}>
            {badge.label}
          </Badge>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1 pl-7">
        {children}
      </div>
    </div>
  );
}

export function DemoDataReference() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Demo Data & Test Scenarios
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Use this data to test via phone (Bland) or in-browser (ElevenLabs)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Section
          title="Provider Credentials (for Authentication)"
          icon={<UserCheck className="h-3.5 w-3.5 text-primary" />}
          defaultOpen
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">Provider</th>
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">NPI</th>
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">Zip</th>
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">Specialty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-1.5 font-medium">Dr. Jasleen Sohal</td>
                  <td className="py-1.5"><Mono>1003045220</Mono></td>
                  <td className="py-1.5"><Mono>94597</Mono></td>
                  <td className="py-1.5 text-muted-foreground">Family Practice</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">Dr. Kali Tileston</td>
                  <td className="py-1.5"><Mono>1003045683</Mono></td>
                  <td className="py-1.5"><Mono>95128</Mono> or <Mono>95148</Mono></td>
                  <td className="py-1.5 text-muted-foreground">Orthopedic Surgery</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">Dr. Kyle Edmonds</td>
                  <td className="py-1.5"><Mono>1003044728</Mono></td>
                  <td className="py-1.5"><Mono>92103</Mono></td>
                  <td className="py-1.5 text-muted-foreground">Palliative Care</td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">Dr. Ardalan Enkeshafi</td>
                  <td className="py-1.5"><Mono>1003000126</Mono></td>
                  <td className="py-1.5"><Mono>20032</Mono></td>
                  <td className="py-1.5 text-muted-foreground">Hospitalist</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Patients"
          icon={<Users className="h-3.5 w-3.5 text-blue-500" />}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">Name</th>
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">DOB</th>
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">Member ID</th>
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">Plan</th>
                  <th className="text-left py-1.5 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-1.5 font-medium">John Smith</td>
                  <td className="py-1.5"><Mono>03/04/1982</Mono></td>
                  <td className="py-1.5"><Mono>MBR-001234</Mono></td>
                  <td className="py-1.5">Gold PPO</td>
                  <td className="py-1.5"><Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Active</Badge></td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">Mary Johnson</td>
                  <td className="py-1.5"><Mono>08/15/1975</Mono></td>
                  <td className="py-1.5"><Mono>MBR-001235</Mono></td>
                  <td className="py-1.5">Silver HMO</td>
                  <td className="py-1.5"><Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Active</Badge></td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">Patricia Brown</td>
                  <td className="py-1.5"><Mono>05/30/1968</Mono></td>
                  <td className="py-1.5"><Mono>MBR-001237</Mono></td>
                  <td className="py-1.5">Platinum PPO</td>
                  <td className="py-1.5"><Badge className="bg-emerald-100 text-emerald-700 text-[9px]">Active</Badge></td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">Linda Garcia</td>
                  <td className="py-1.5"><Mono>09/08/1980</Mono></td>
                  <td className="py-1.5"><Mono>MBR-001239</Mono></td>
                  <td className="py-1.5">Silver HMO</td>
                  <td className="py-1.5"><Badge className="bg-red-100 text-red-700 text-[9px]">Termed</Badge></td>
                </tr>
                <tr>
                  <td className="py-1.5 font-medium">David Miller</td>
                  <td className="py-1.5"><Mono>04/18/1972</Mono></td>
                  <td className="py-1.5"><Mono>MBR-001240</Mono></td>
                  <td className="py-1.5">Gold PPO</td>
                  <td className="py-1.5"><Badge className="bg-amber-100 text-amber-700 text-[9px]">Inactive</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Eligibility Scenarios"
          icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
        >
          <ScenarioCard number={1} title="Active Member — Basic" badge={{ label: "Happy Path", className: "bg-emerald-100 text-emerald-700" }}>
            <p><strong>Provider:</strong> Dr. Sohal — NPI <Mono>1003045220</Mono>, Zip <Mono>94597</Mono></p>
            <p><strong>Patient:</strong> John Smith — DOB March 4, 1982</p>
            <p><strong>Expected:</strong> Active, Gold PPO, $20 copay, $1,500 deductible ($420 met)</p>
          </ScenarioCard>
          <ScenarioCard number={2} title="Service Check — MRI">
            <p><strong>Provider:</strong> Dr. Sohal — NPI <Mono>1003045220</Mono>, Zip <Mono>94597</Mono></p>
            <p><strong>Patient:</strong> John Smith — say "MRI" when asked about service</p>
            <p><strong>Expected:</strong> Covered, $150 copay, no prior auth (Gold PPO)</p>
          </ScenarioCard>
          <ScenarioCard number={3} title="Service Requiring Prior Auth (HMO)">
            <p><strong>Provider:</strong> Dr. Tileston — NPI <Mono>1003045683</Mono>, Zip <Mono>95148</Mono></p>
            <p><strong>Patient:</strong> Mary Johnson — DOB Aug 15, 1975 — say "physical therapy"</p>
            <p><strong>Expected:</strong> Covered, $50 copay, <strong>prior auth required</strong>, 20 visits/year</p>
          </ScenarioCard>
          <ScenarioCard number={4} title="Termed Member" badge={{ label: "Edge Case", className: "bg-amber-100 text-amber-700" }}>
            <p><strong>Provider:</strong> Dr. Edmonds — NPI <Mono>1003044728</Mono>, Zip <Mono>92103</Mono></p>
            <p><strong>Patient:</strong> Linda Garcia — DOB Sep 8, 1980</p>
            <p><strong>Expected:</strong> Status: <strong>Termed</strong> (Dec 31, 2025)</p>
          </ScenarioCard>
          <ScenarioCard number={5} title="Service Not Covered" badge={{ label: "Edge Case", className: "bg-amber-100 text-amber-700" }}>
            <p><strong>Provider:</strong> Dr. Tileston — NPI <Mono>1003045683</Mono>, Zip <Mono>95148</Mono></p>
            <p><strong>Patient:</strong> Mary Johnson — say "chiropractic"</p>
            <p><strong>Expected:</strong> <strong>Not covered</strong> under Silver HMO</p>
          </ScenarioCard>
        </Section>

        <Section
          title="Claims Scenarios"
          icon={<FileText className="h-3.5 w-3.5 text-blue-500" />}
        >
          <ScenarioCard number={6} title="Paid Claim" badge={{ label: "Happy Path", className: "bg-emerald-100 text-emerald-700" }}>
            <p><strong>Provider:</strong> Dr. Sohal — NPI <Mono>1003045220</Mono>, Zip <Mono>94597</Mono></p>
            <p><strong>Claim #:</strong> <Mono>CLM-00481922</Mono></p>
            <p><strong>Expected:</strong> Paid — $850 billed → $570 paid, Check CHK-0018472</p>
          </ScenarioCard>
          <ScenarioCard number={7} title="Denied Claim">
            <p><strong>Provider:</strong> Dr. Sohal — NPI <Mono>1003045220</Mono>, Zip <Mono>94597</Mono></p>
            <p><strong>Claim #:</strong> <Mono>CLM-00519833</Mono></p>
            <p><strong>Expected:</strong> Denied, CO-97 — "not covered by plan benefit", appeal by Jul 24, 2026</p>
          </ScenarioCard>
          <ScenarioCard number={8} title="Pending Claim">
            <p><strong>Provider:</strong> Dr. Tileston — NPI <Mono>1003045683</Mono>, Zip <Mono>95128</Mono></p>
            <p><strong>Claim #:</strong> <Mono>CLM-00520200</Mono></p>
            <p><strong>Expected:</strong> Pending — joint injection, received Jan 23, 2026</p>
          </ScenarioCard>
          <ScenarioCard number={9} title="Claim Not Found" badge={{ label: "Edge Case", className: "bg-amber-100 text-amber-700" }}>
            <p><strong>Provider:</strong> Any — Claim #: <Mono>CLM-99999999</Mono></p>
            <p><strong>Expected:</strong> "No claim found" — agent offers to search by patient name</p>
          </ScenarioCard>
        </Section>

        <Section
          title="Prior Auth Scenarios"
          icon={<ShieldCheck className="h-3.5 w-3.5 text-purple-500" />}
        >
          <ScenarioCard number={10} title="Approved PA" badge={{ label: "Happy Path", className: "bg-emerald-100 text-emerald-700" }}>
            <p><strong>Provider:</strong> Dr. Sohal — NPI <Mono>1003045220</Mono>, Zip <Mono>94597</Mono></p>
            <p><strong>PA ID:</strong> <Mono>PA-00012345</Mono></p>
            <p><strong>Expected:</strong> Approved — MRI Lumbar Spine, 1 procedure, expires Jul 18, 2026</p>
          </ScenarioCard>
          <ScenarioCard number={11} title="Denied PA">
            <p><strong>Provider:</strong> Dr. Tileston — NPI <Mono>1003045683</Mono>, Zip <Mono>95128</Mono></p>
            <p><strong>PA ID:</strong> <Mono>PA-00012400</Mono></p>
            <p><strong>Expected:</strong> Denied — Knee Arthroscopy, "medical necessity not met"</p>
          </ScenarioCard>
          <ScenarioCard number={12} title="Pending PA">
            <p><strong>Provider:</strong> Dr. Sohal — NPI <Mono>1003045220</Mono>, Zip <Mono>94597</Mono></p>
            <p><strong>PA ID:</strong> <Mono>PA-00012500</Mono></p>
            <p><strong>Expected:</strong> Pending Review — Physical Therapy, 12 visits</p>
          </ScenarioCard>
          <ScenarioCard number={13} title="PA Lookup by Member ID">
            <p><strong>Provider:</strong> Dr. Tileston — NPI <Mono>1003045683</Mono>, Zip <Mono>95148</Mono></p>
            <p><strong>Member ID:</strong> <Mono>MBR-001235</Mono></p>
            <p><strong>Expected:</strong> Returns PA-00012510 — Total Knee Replacement, Approved</p>
          </ScenarioCard>
        </Section>

        <Section
          title="Edge Cases & Failures"
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        >
          <ScenarioCard number={14} title="Wrong Zip Code" badge={{ label: "Auth Fail", className: "bg-red-100 text-red-700" }}>
            <p><strong>NPI:</strong> <Mono>1003045220</Mono>, Zip: <Mono>90210</Mono> (wrong for Dr. Sohal)</p>
            <p><strong>Expected:</strong> Zip verification fails</p>
          </ScenarioCard>
          <ScenarioCard number={15} title="Invalid NPI" badge={{ label: "Auth Fail", className: "bg-red-100 text-red-700" }}>
            <p><strong>NPI:</strong> <Mono>0000000000</Mono></p>
            <p><strong>Expected:</strong> NPI not found</p>
          </ScenarioCard>
          <ScenarioCard number={16} title="Patient Not Found" badge={{ label: "Edge Case", className: "bg-amber-100 text-amber-700" }}>
            <p><strong>Patient:</strong> "Jane Doe, DOB January 1, 2000"</p>
            <p><strong>Expected:</strong> No member found</p>
          </ScenarioCard>
        </Section>
      </CardContent>
    </Card>
  );
}
