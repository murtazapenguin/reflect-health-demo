import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Five9Sidebar } from "./Five9Sidebar";
import { Five9Header } from "./Five9Header";
import { Five9AgentPanel } from "./Five9AgentPanel";
import { Five9AIPanel } from "./Five9AIPanel";
import { LiveCallSimulation } from "./LiveCallSimulation";
import { FloatingROIWidget } from "./FloatingROIWidget";
import { Five9SupervisorView } from "./Five9SupervisorView";
import { Five9EmailView } from "./Five9EmailView";
import { Five9ChatView } from "./Five9ChatView";
import { Five9HistoryView } from "./Five9HistoryView";

export type Five9Tab = "agent" | "supervisor";
export type Five9SidebarTab = "calls" | "email" | "chat" | "history" | "supervisor";

export function Five9Layout() {
  const [activeTab, setActiveTab] = useState<Five9Tab>("agent");
  const [sidebarTab, setSidebarTab] = useState<Five9SidebarTab>("calls");

  const handleSidebarTab = (tab: Five9SidebarTab) => {
    setSidebarTab(tab);
    if (tab === "supervisor") {
      setActiveTab("supervisor");
    } else {
      setActiveTab("agent");
    }
  };

  const renderContent = () => {
    if (activeTab === "supervisor") {
      return <Five9SupervisorView />;
    }

    switch (sidebarTab) {
      case "email":
        return <Five9EmailView />;
      case "chat":
        return <Five9ChatView />;
      case "history":
        return <Five9HistoryView />;
      default:
        return (
          <div className="grid grid-cols-12 gap-0 h-full">
            <div className="col-span-3 border-r five9-border overflow-y-auto">
              <Five9AgentPanel />
            </div>
            <div className="col-span-5 border-r five9-border overflow-y-auto">
              <LiveCallSimulation />
            </div>
            <div className="col-span-4 overflow-y-auto">
              <Five9AIPanel />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col five9-bg">
      <Five9Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-1 overflow-hidden">
        <Five9Sidebar activeTab={sidebarTab} setActiveTab={handleSidebarTab} />
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
      <FloatingROIWidget />
    </div>
  );
}
