import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare, Mic, ListTodo, Settings, LayoutDashboard,
  ChevronLeft, ChevronRight, Bot, Zap, Bell, GitBranch
} from "lucide-react";
import { useAppStore } from "../store";
import { useGateway } from "../hooks/useGateway";
import { OnboardingWizard } from "../components/onboarding/OnboardingWizard";
import { OrchestratorChat } from "../components/chat/OrchestratorChat";
import { VoicePanel } from "../components/voice/VoicePanel";
import { TaskManager } from "../components/tasks/TaskManager";
import { SettingsPanel } from "../components/settings/SettingsPanel";

// ─── Dashboard overview ───────────────────────────────────────────────────────

function Dashboard() {
  const { sessions, tasks, cronJobs, gateway } = useAppStore();
  const activeTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const pendingTasks = tasks.filter((t) => t.status === "SCHEDULED" || t.status === "PENDING").length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const failedTasks = tasks.filter((t) => t.status === "FAILED").length;

  const stats = [
    { label: "Active Sessions", value: sessions.filter((s) => s.status === "active").length, color: "text-ara-400", icon: <MessageSquare className="w-5 h-5" /> },
    { label: "Tasks Running", value: activeTasks, color: "text-amber-400", icon: <Zap className="w-5 h-5" /> },
    { label: "Completed", value: completedTasks, color: "text-emerald-400", icon: <Bot className="w-5 h-5" /> },
    { label: "Scheduled Jobs", value: cronJobs.filter((j) => j.enabled).length, color: "text-purple-400", icon: <GitBranch className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-surface p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">
          {gateway.ready ? "Gateway connected — ARA is ready" : "Gateway starting up..."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl bg-white/5 border border-white/8">
            <div className="flex items-center gap-3 mb-2">
              <div className={`${stat.color} opacity-70`}>{stat.icon}</div>
              <span className="text-xs text-white/40">{stat.label}</span>
            </div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Recent Conversations</h2>
        {sessions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/3 border border-white/6 text-center">
            <MessageSquare className="w-8 h-8 text-white/15 mx-auto mb-2" />
            <p className="text-sm text-white/30">No conversations yet — start chatting with ARA</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{s.label ?? s.key.slice(0, 12)}</p>
                  {s.lastMessage && <p className="text-xs text-white/35 truncate mt-0.5">{s.lastMessage}</p>}
                </div>
                <span className="text-xs text-white/25">{new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task summary */}
      {(activeTasks > 0 || pendingTasks > 0 || failedTasks > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Task Status</h2>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/8">
            <div className="flex gap-4">
              {activeTasks > 0 && <div className="text-center"><p className="text-xl font-bold text-amber-400">{activeTasks}</p><p className="text-xs text-white/40">Running</p></div>}
              {pendingTasks > 0 && <div className="text-center"><p className="text-xl font-bold text-blue-400">{pendingTasks}</p><p className="text-xs text-white/40">Pending</p></div>}
              {failedTasks > 0 && <div className="text-center"><p className="text-xl font-bold text-red-400">{failedTasks}</p><p className="text-xs text-white/40">Failed</p></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  active,
  badge,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all ${
        active
          ? "bg-ara-900/60 text-white border border-ara-700/50"
          : "text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent"
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span className={`${collapsed ? "absolute -top-1 -right-1" : "ml-auto"} w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold`}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type View = "dashboard" | "chat" | "voice" | "tasks" | "settings";

function Sidebar({
  currentView,
  setView,
  collapsed,
  onToggle,
}: {
  currentView: View;
  setView: (v: View) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { tasks, gateway } = useAppStore();
  const pendingApprovals = 2; // demo
  const failedTasks = tasks.filter((t) => t.status === "FAILED").length;

  const navItems: { id: View; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: "dashboard", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
    { id: "chat",      icon: <MessageSquare className="w-5 h-5" />,   label: "Orchestrator" },
    { id: "voice",     icon: <Mic className="w-5 h-5" />,             label: "Voice Agent" },
    { id: "tasks",     icon: <ListTodo className="w-5 h-5" />,        label: "Tasks", badge: pendingApprovals + failedTasks },
    { id: "settings",  icon: <Settings className="w-5 h-5" />,        label: "Settings" },
  ];

  return (
    <div
      className={`flex flex-col border-r border-white/8 transition-all duration-200 ${
        collapsed ? "w-16" : "w-52"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-white/8 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ara-500 to-ara-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-ara-900/50">
          <span className="text-sm font-black text-white">A</span>
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white">ARA</p>
            <p className="text-xs text-white/30">Agent Platform</p>
          </div>
        )}
      </div>

      {/* Gateway status */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-white/8">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/3">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${gateway.ready ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
            <span className="text-xs text-white/40 truncate">
              {gateway.ready ? `Gateway :${gateway.port ?? 18789}` : "Connecting..."}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.id}
            badge={item.badge}
            collapsed={collapsed}
            onClick={() => setView(item.id)}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-white/8">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-white/8 text-white/30 hover:text-white/60 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { onboardingComplete, setOnboardingComplete, sidebarCollapsed, toggleSidebar } = useAppStore();
  const [currentView, setCurrentView] = useState<View>("dashboard");

  // Mount the gateway hook at root level
  useGateway();

  const views: Record<View, React.ReactNode> = {
    dashboard: <Dashboard />,
    chat:      <OrchestratorChat />,
    voice:     <VoicePanel />,
    tasks:     <TaskManager />,
    settings:  <SettingsPanel />,
  };

  // Show onboarding if not complete
  if (!onboardingComplete) {
    return (
      <div className="h-screen bg-surface overflow-hidden">
        <OnboardingWizard onComplete={() => setOnboardingComplete(true)} />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-surface overflow-hidden text-white">
      <Sidebar
        currentView={currentView}
        setView={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <main className="flex-1 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {views[currentView]}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
