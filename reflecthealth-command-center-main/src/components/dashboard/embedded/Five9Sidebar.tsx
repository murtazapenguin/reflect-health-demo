import { Phone, Mail, MessageSquare, Clock, Users } from "lucide-react";
import type { Five9SidebarTab } from "./Five9Layout";

const navItems: { icon: typeof Phone; label: string; tab: Five9SidebarTab }[] = [
  { icon: Phone, label: "Calls", tab: "calls" },
  { icon: Mail, label: "Email", tab: "email" },
  { icon: MessageSquare, label: "Chat", tab: "chat" },
  { icon: Clock, label: "History", tab: "history" },
  { icon: Users, label: "Supervisor", tab: "supervisor" },
];

interface Props {
  activeTab: Five9SidebarTab;
  setActiveTab: (tab: Five9SidebarTab) => void;
}

export function Five9Sidebar({ activeTab, setActiveTab }: Props) {
  return (
    <div className="w-14 five9-sidebar flex flex-col items-center py-3 gap-1 shrink-0">
      {navItems.map((item) => (
        <button
          key={item.label}
          title={item.label}
          onClick={() => setActiveTab(item.tab)}
          className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
            activeTab === item.tab
              ? "bg-white/15 text-white"
              : "text-white/50 hover:text-white/80 hover:bg-white/10"
          }`}
        >
          <item.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
