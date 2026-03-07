import { useState } from "react";
import { Five9Sidebar } from "./Five9Sidebar";
import { Five9Header } from "./Five9Header";
import { Five9AIPanel } from "./Five9AIPanel";
import { FloatingROIWidget } from "./FloatingROIWidget";
import { Five9SupervisorView } from "./Five9SupervisorView";
import { Five9CallLog } from "./Five9CallLog";
import { Five9ReportingView } from "./Five9ReportingView";
import { VoiceAgent } from "../VoiceAgent";
import { ConversationProvider } from "@/contexts/ConversationContext";

export type Five9Tab = "agent" | "supervisor";
export type Five9SidebarTab = "calls" | "history" | "reporting" | "supervisor";

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
      case "history":
        return <Five9CallLog />;
      case "reporting":
        return <Five9ReportingView onNavigateToCallLog={() => handleSidebarTab("history")} />;
      default:
        return (
          <ConversationProvider>
            <div className="grid grid-cols-12 gap-0 h-full">
              <div className="col-span-8 border-r five9-border overflow-y-auto">
                <VoiceAgent />
              </div>
              <div className="col-span-4 overflow-y-auto">
                <Five9AIPanel />
              </div>
            </div>
          </ConversationProvider>
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
