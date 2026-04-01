import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  sessionKey?: string;
  agentId?: string;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: string;
  output?: string;
  status: "pending" | "running" | "done" | "error";
}

export interface Session {
  key: string;
  id?: string;
  agentId?: string;
  label?: string;
  parentSessionKey?: string;
  createdAt: number;
  lastMessage?: string;
  status: "active" | "idle" | "error";
  messages: Message[];
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  model?: string;
  systemPrompt?: string;
  tools?: string[];
  isBuiltIn?: boolean;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agentId?: string;
  message: string;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
  lastStatus?: "ok" | "error" | "skipped";
}

export interface TaskItem {
  id: string;
  type: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "PENDING";
  description: string;
  vendor?: string;
  sessionKey?: string;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface GatewayStatus {
  ready: boolean;
  port?: number;
  token?: string;
  connectedAt?: number;
  sessionCount?: number;
  agentCount?: number;
  uptime?: string;
  error?: string;
}

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  provider: "openai" | "elevenlabs" | "deepgram";
  voice: string;
  enabled: boolean;
}

export interface AppSettings {
  onboardingComplete: boolean;
  activeProvider: string;
  activeModel: string;
  model: string;
  hasOpenAIKey: boolean;
  hasAnthropicKey: boolean;
  hasGeminiKey: boolean;
  gatewayPort: number;
  gatewayToken: string;
  openrouterKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  elevenlabsKey?: string;
  deepgramKey?: string;
  useRemoteGateway?: boolean;
  remoteGatewayUrl?: string;
  autoSpawnAgents?: boolean;
  requireApproval?: boolean;
  notifyTaskComplete?: boolean;
  notifyTaskFailed?: boolean;
  notifyHoldEnd?: boolean;
  notifyApproval?: boolean;
  notifyBilling?: boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AppState {
  // Gateway
  gateway: GatewayStatus;
  setGatewayStatus: (status: GatewayStatus) => void;
  setGateway: (patch: Partial<GatewayStatus>) => void;

  // Onboarding
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;

  // Settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Sessions
  sessions: Session[];
  activeSessionKey: string | null;
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (key: string, updates: Partial<Session>) => void;
  setActiveSession: (key: string | null) => void;
  addMessage: (sessionKey: string, message: Message) => void;
  updateMessage: (sessionKey: string, messageId: string, updates: Partial<Message>) => void;

  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  removeAgent: (id: string) => void;

  // Cron jobs
  cronJobs: CronJob[];
  setCronJobs: (jobs: CronJob[]) => void;
  addCronJob: (job: CronJob) => void;
  updateCronJob: (id: string, updates: Partial<CronJob>) => void;
  removeCronJob: (id: string) => void;

  // Tasks
  tasks: TaskItem[];
  setTasks: (tasks: TaskItem[]) => void;
  addTask: (task: TaskItem) => void;
  updateTask: (id: string, updates: Partial<TaskItem>) => void;

  // Voice
  voice: VoiceState;
  setVoice: (updates: Partial<VoiceState>) => void;

  // UI
  currentView: string;
  setCurrentView: (view: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  gatewayLogs: Array<{ level: string; message: string; ts: number }>;
  addGatewayLog: (log: { level: string; message: string }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Gateway
  gateway: { ready: false },
  setGatewayStatus: (status) => set({ gateway: status }),
  setGateway: (patch) => set((state) => ({ gateway: { ...state.gateway, ...patch } })),

  // Onboarding
  onboardingComplete: false,
  setOnboardingComplete: (v) => set({ onboardingComplete: v }),

  // Settings
  settings: {
    onboardingComplete: false,
    activeProvider: "openrouter",
    activeModel: "meta-llama/llama-3.3-70b-instruct:free",
    model: "openrouter/meta-llama/llama-3-8b-instruct:free",
    hasOpenAIKey: false,
    hasAnthropicKey: false,
    hasGeminiKey: false,
    gatewayPort: 18789,
    gatewayToken: "",
    autoSpawnAgents: true,
    requireApproval: true,
    notifyTaskComplete: true,
    notifyTaskFailed: true,
    notifyHoldEnd: true,
    notifyApproval: true,
    notifyBilling: true,
  },
  setSettings: (updates) =>
    set((state) => ({ settings: { ...state.settings, ...updates } })),
  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),

  // Sessions
  sessions: [],
  activeSessionKey: null,
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) =>
    set((state) => ({ sessions: [session, ...state.sessions] })),
  updateSession: (key, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.key === key ? { ...s, ...updates } : s
      ),
    })),
  setActiveSession: (key) => set({ activeSessionKey: key }),
  addMessage: (sessionKey, message) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.key === sessionKey
          ? { ...s, messages: [...s.messages, message], lastMessage: message.content }
          : s
      ),
    })),
  updateMessage: (sessionKey, messageId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.key === sessionKey
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
            }
          : s
      ),
    })),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
  updateAgent: (id, patch) =>
    set((state) => ({ agents: state.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  removeAgent: (id) =>
    set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),

  // Cron jobs
  cronJobs: [],
  setCronJobs: (cronJobs) => set({ cronJobs }),
  addCronJob: (job) => set((state) => ({ cronJobs: [...state.cronJobs, job] })),
  updateCronJob: (id, updates) =>
    set((state) => ({
      cronJobs: state.cronJobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    })),
  removeCronJob: (id) =>
    set((state) => ({ cronJobs: state.cronJobs.filter((j) => j.id !== id) })),

  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  // Voice
  voice: {
    isListening: false,
    isSpeaking: false,
    transcript: "",
    interimTranscript: "",
    provider: "openai",
    voice: "alloy",
    enabled: false,
  },
  setVoice: (updates) =>
    set((state) => ({ voice: { ...state.voice, ...updates } })),

  // UI
  currentView: "dashboard",
  setCurrentView: (view) => set({ currentView: view }),
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  gatewayLogs: [],
  addGatewayLog: (log) =>
    set((state) => ({
      gatewayLogs: [
        ...state.gatewayLogs.slice(-199),
        { ...log, ts: Date.now() },
      ],
    })),
}));
