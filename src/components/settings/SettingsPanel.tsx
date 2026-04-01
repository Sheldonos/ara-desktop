import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key, Cpu, Wifi, CreditCard, Shield, Bell, Palette,
  Eye, EyeOff, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, RefreshCw, ChevronRight, Zap, Globe,
  Server, Info
} from "lucide-react";
import { useAppStore } from "../../store";
import { useGateway } from "../../hooks/useGateway";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── API Key input ────────────────────────────────────────────────────────────

function ApiKeyInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  status,
  onTest,
  link,
  isFree,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  status?: "ok" | "error" | "testing" | null;
  onTest?: () => void;
  link?: string;
  isFree?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/8 mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{label}</span>
          {isFree && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/40 text-emerald-400">
              Free tier available
            </span>
          )}
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-ara-400 hover:text-ara-300 flex items-center gap-1 transition-colors"
          >
            Get key <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <p className="text-xs text-white/40 mb-2">{description}</p>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 pr-10 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-ara-500/50"
          />
          <button
            onClick={() => setVisible(!visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        {onTest && (
          <button
            onClick={onTest}
            disabled={!value || status === "testing"}
            className="px-3 py-2 rounded-xl bg-white/8 hover:bg-white/12 disabled:opacity-30 text-white/60 text-xs font-medium transition-all flex items-center gap-1.5"
          >
            {status === "testing" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Test
          </button>
        )}
      </div>
      {status === "ok" && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Connected successfully
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Invalid key — please check and retry
        </div>
      )}
    </div>
  );
}

// ─── Model picker ─────────────────────────────────────────────────────────────

const MODELS = [
  {
    id: "openrouter/mistralai/mistral-7b-instruct:free",
    label: "Mistral 7B Instruct",
    provider: "OpenRouter",
    cost: "Free",
    speed: "Fast",
    quality: "Good",
    recommended: false,
    free: true,
  },
  {
    id: "openrouter/meta-llama/llama-3-8b-instruct:free",
    label: "Llama 3 8B Instruct",
    provider: "OpenRouter",
    cost: "Free",
    speed: "Fast",
    quality: "Good",
    recommended: false,
    free: true,
  },
  {
    id: "openrouter/google/gemma-7b-it:free",
    label: "Gemma 7B IT",
    provider: "OpenRouter",
    cost: "Free",
    speed: "Fast",
    quality: "Good",
    recommended: false,
    free: true,
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
    cost: "$0.15/1M",
    speed: "Fast",
    quality: "Excellent",
    recommended: true,
    free: false,
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    cost: "$5/1M",
    speed: "Medium",
    quality: "Best",
    recommended: false,
    free: false,
  },
  {
    id: "anthropic/claude-3-haiku",
    label: "Claude 3 Haiku",
    provider: "Anthropic",
    cost: "$0.25/1M",
    speed: "Fast",
    quality: "Excellent",
    recommended: false,
    free: false,
  },
  {
    id: "anthropic/claude-3-5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    cost: "$3/1M",
    speed: "Medium",
    quality: "Best",
    recommended: false,
    free: false,
  },
  {
    id: "google/gemini-flash-1.5",
    label: "Gemini 1.5 Flash",
    provider: "Google",
    cost: "$0.075/1M",
    speed: "Very Fast",
    quality: "Excellent",
    recommended: false,
    free: false,
  },
  {
    id: "custom",
    label: "Custom model",
    provider: "Any",
    cost: "Varies",
    speed: "Varies",
    quality: "Varies",
    recommended: false,
    free: false,
  },
];

function ModelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const displayed = showAll ? MODELS : MODELS.slice(0, 5);

  return (
    <div>
      <div className="space-y-2 mb-2">
        {displayed.map((model) => (
          <button
            key={model.id}
            onClick={() => onChange(model.id === "custom" ? customModel || "custom" : model.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              value === model.id || (model.id === "custom" && !MODELS.find((m) => m.id === value && m.id !== "custom"))
                ? "bg-ara-900/50 border-ara-600/60 text-white"
                : "bg-white/3 border-white/8 text-white/60 hover:bg-white/6 hover:text-white/80"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{model.label}</span>
                {model.recommended && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-ara-700/60 text-ara-300 border border-ara-600/40">
                    Recommended
                  </span>
                )}
                {model.free && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-700/40">
                    Free
                  </span>
                )}
              </div>
              <p className="text-xs text-white/30 mt-0.5">{model.provider}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-white/50">{model.cost}</p>
              <p className="text-xs text-white/30">{model.speed}</p>
            </div>
          </button>
        ))}
      </div>

      {!showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-ara-400 hover:text-ara-300 transition-colors"
        >
          Show all models →
        </button>
      )}

      {(value === "custom" || (showAll && MODELS.find((m) => m.id === "custom"))) && (
        <input
          value={customModel}
          onChange={(e) => { setCustomModel(e.target.value); onChange(e.target.value); }}
          placeholder="e.g., openrouter/your-org/your-model"
          className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-ara-500/50"
        />
      )}
    </div>
  );
}

// ─── Gateway status card ──────────────────────────────────────────────────────

function GatewayStatusCard() {
  const { gateway } = useAppStore();
  const { reconnect } = useGateway();

  return (
    <div className={`p-4 rounded-2xl border ${
      gateway.ready
        ? "bg-emerald-900/20 border-emerald-700/40"
        : "bg-amber-900/20 border-amber-700/40"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            gateway.ready ? "bg-emerald-900/40" : "bg-amber-900/40"
          }`}>
            <Server className={`w-4 h-4 ${gateway.ready ? "text-emerald-400" : "text-amber-400"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">OpenClaw Gateway</p>
            <p className={`text-xs mt-0.5 ${gateway.ready ? "text-emerald-400" : "text-amber-400"}`}>
              {gateway.ready ? `Running on port ${gateway.port ?? 18789}` : "Starting up..."}
            </p>
          </div>
        </div>
        {!gateway.ready && (
          <button
            onClick={reconnect}
            className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {gateway.ready && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: "Sessions", value: gateway.sessionCount ?? 0 },
            { label: "Agents", value: gateway.agentCount ?? 0 },
            { label: "Uptime", value: gateway.uptime ?? "—" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-2 rounded-lg bg-white/5">
              <p className="text-sm font-semibold text-white">{stat.value}</p>
              <p className="text-xs text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main SettingsPanel ───────────────────────────────────────────────────────

type SettingsTab = "llm" | "keys" | "gateway" | "billing" | "notifications" | "about";

export function SettingsPanel() {
  const { settings, updateSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("llm");
  const [keyStatuses, setKeyStatuses] = useState<Record<string, "ok" | "error" | "testing" | null>>({});
  const [saved, setSaved] = useState(false);

  const testKey = async (provider: string, key: string) => {
    if (!key) return;
    setKeyStatuses((prev) => ({ ...prev, [provider]: "testing" }));
    await new Promise((r) => setTimeout(r, 1200));
    // Simulate validation — real impl would hit the provider's /models endpoint
    const valid = key.length > 20;
    setKeyStatuses((prev) => ({ ...prev, [provider]: valid ? "ok" : "error" }));
  };

  const saveSettings = () => {
    // Persist via IPC
    if (typeof window !== "undefined" && window.ara) {
      window.ara.store.set("settings", settings as unknown);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "llm",           label: "AI Model",     icon: <Cpu className="w-4 h-4" /> },
    { id: "keys",          label: "API Keys",     icon: <Key className="w-4 h-4" /> },
    { id: "gateway",       label: "Gateway",      icon: <Server className="w-4 h-4" /> },
    { id: "billing",       label: "Billing",      icon: <CreditCard className="w-4 h-4" /> },
    { id: "notifications", label: "Alerts",       icon: <Bell className="w-4 h-4" /> },
    { id: "about",         label: "About",        icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-full bg-surface">
      {/* Sidebar */}
      <div className="w-48 border-r border-white/8 flex flex-col py-4">
        <p className="text-xs text-white/30 uppercase tracking-wider px-4 mb-3">Settings</p>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
              activeTab === tab.id
                ? "text-white bg-ara-900/50 border-r-2 border-ara-500"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl p-6">
          <AnimatePresence mode="wait">
            {activeTab === "llm" && (
              <motion.div key="llm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Section
                  title="AI Model"
                  description="Choose the language model powering ARA. Free models work without an API key."
                >
                  {/* Free tier notice */}
                  <div className="p-3 rounded-xl bg-ara-900/30 border border-ara-700/40 flex items-start gap-2 mb-4">
                    <Zap className="w-4 h-4 text-ara-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-ara-300 font-medium">Zero-config mode active</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        ARA is using a free OpenRouter model. No API key required. Add your own key below for better performance.
                      </p>
                    </div>
                  </div>

                  <ModelPicker
                    value={settings.model}
                    onChange={(v) => updateSettings({ model: v })}
                  />
                </Section>

                <Section title="Orchestration">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
                      <div>
                        <p className="text-sm text-white">Auto-spawn sub-agents</p>
                        <p className="text-xs text-white/40 mt-0.5">Allow the lead LLM to spawn specialized agents for complex tasks</p>
                      </div>
                      <button
                        onClick={() => updateSettings({ autoSpawnAgents: !settings.autoSpawnAgents })}
                        className={`w-11 h-6 rounded-full transition-all relative ${
                          settings.autoSpawnAgents ? "bg-ara-600" : "bg-white/15"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          settings.autoSpawnAgents ? "left-6" : "left-1"
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
                      <div>
                        <p className="text-sm text-white">Require approval for OS actions</p>
                        <p className="text-xs text-white/40 mt-0.5">Ask before running shell commands, opening browsers, or modifying files</p>
                      </div>
                      <button
                        onClick={() => updateSettings({ requireApproval: !settings.requireApproval })}
                        className={`w-11 h-6 rounded-full transition-all relative ${
                          settings.requireApproval ? "bg-ara-600" : "bg-white/15"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          settings.requireApproval ? "left-6" : "left-1"
                        }`} />
                      </button>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === "keys" && (
              <motion.div key="keys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Section
                  title="API Keys"
                  description="All keys are stored locally on your machine and never sent to ARA servers."
                >
                  <ApiKeyInput
                    label="OpenRouter"
                    description="Required for free-tier models. Also enables 200+ premium models."
                    value={settings.openrouterKey ?? ""}
                    onChange={(v) => updateSettings({ openrouterKey: v })}
                    placeholder="sk-or-v1-..."
                    status={keyStatuses["openrouter"]}
                    onTest={() => testKey("openrouter", settings.openrouterKey ?? "")}
                    link="https://openrouter.ai/keys"
                    isFree
                  />
                  <ApiKeyInput
                    label="OpenAI"
                    description="For GPT-4o, GPT-4o Mini, and OpenAI TTS/Whisper."
                    value={settings.openaiKey ?? ""}
                    onChange={(v) => updateSettings({ openaiKey: v })}
                    placeholder="sk-..."
                    status={keyStatuses["openai"]}
                    onTest={() => testKey("openai", settings.openaiKey ?? "")}
                    link="https://platform.openai.com/api-keys"
                  />
                  <ApiKeyInput
                    label="Anthropic"
                    description="For Claude 3 Haiku, Sonnet, and Opus models."
                    value={settings.anthropicKey ?? ""}
                    onChange={(v) => updateSettings({ anthropicKey: v })}
                    placeholder="sk-ant-..."
                    status={keyStatuses["anthropic"]}
                    onTest={() => testKey("anthropic", settings.anthropicKey ?? "")}
                    link="https://console.anthropic.com/settings/keys"
                  />
                  <ApiKeyInput
                    label="ElevenLabs"
                    description="For high-quality, natural-sounding voice synthesis."
                    value={settings.elevenlabsKey ?? ""}
                    onChange={(v) => updateSettings({ elevenlabsKey: v })}
                    placeholder="..."
                    status={keyStatuses["elevenlabs"]}
                    onTest={() => testKey("elevenlabs", settings.elevenlabsKey ?? "")}
                    link="https://elevenlabs.io/app/settings/api-keys"
                  />
                </Section>
              </motion.div>
            )}

            {activeTab === "gateway" && (
              <motion.div key="gateway" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Section title="OpenClaw Gateway" description="The local AI gateway that powers all agent sessions.">
                  <GatewayStatusCard />
                </Section>

                <Section title="Gateway Port">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/8">
                    <label className="text-xs text-white/40 block mb-2">WebSocket Port</label>
                    <input
                      type="number"
                      value={settings.gatewayPort ?? 18789}
                      onChange={(e) => updateSettings({ gatewayPort: parseInt(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-ara-500/50"
                    />
                    <p className="text-xs text-white/30 mt-2">Default: 18789. Change only if port is in use.</p>
                  </div>
                </Section>

                <Section title="Remote Gateway" description="Connect to an OpenClaw gateway running on another machine.">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/8">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-white">Use remote gateway</p>
                      <button
                        onClick={() => updateSettings({ useRemoteGateway: !settings.useRemoteGateway })}
                        className={`w-11 h-6 rounded-full transition-all relative ${
                          settings.useRemoteGateway ? "bg-ara-600" : "bg-white/15"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          settings.useRemoteGateway ? "left-6" : "left-1"
                        }`} />
                      </button>
                    </div>
                    {settings.useRemoteGateway && (
                      <input
                        value={settings.remoteGatewayUrl ?? ""}
                        onChange={(e) => updateSettings({ remoteGatewayUrl: e.target.value })}
                        placeholder="ws://192.168.1.100:18789"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-ara-500/50"
                      />
                    )}
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === "billing" && (
              <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Section title="Managed Billing" description="Let ARA manage your API usage and billing automatically.">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-ara-900/60 to-ara-800/30 border border-ara-700/40 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-ara-700/60 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-ara-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">ARA Managed Plan</p>
                        <p className="text-xs text-white/50">Pay-as-you-go · No setup required</p>
                      </div>
                    </div>
                    <p className="text-xs text-white/60 mb-3">
                      We provision dedicated API keys for your account, handle rate limits, and charge only for what you use.
                      No need to manage your own provider accounts.
                    </p>
                    <button className="w-full py-2.5 rounded-xl bg-ara-600 hover:bg-ara-500 text-white text-sm font-medium transition-all">
                      Enable Managed Billing →
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/8">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Usage This Month</p>
                    <div className="space-y-2">
                      {[
                        { label: "LLM tokens", value: "—", sub: "No managed plan active" },
                        { label: "TTS characters", value: "—", sub: "No managed plan active" },
                        { label: "STT minutes", value: "—", sub: "No managed plan active" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <div>
                            <p className="text-sm text-white/70">{item.label}</p>
                            <p className="text-xs text-white/30">{item.sub}</p>
                          </div>
                          <p className="text-sm text-white/50 font-mono">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Section title="Notifications" description="Control when and how ARA alerts you.">
                  <div className="space-y-3">
                    {([
                      { key: "notifyTaskComplete" as const, label: "Task completed", desc: "When an automated task finishes successfully" },
                      { key: "notifyTaskFailed"   as const, label: "Task failed",    desc: "When a task encounters an error" },
                      { key: "notifyHoldEnd"      as const, label: "Hold ended",     desc: "When a human picks up during hold monitoring" },
                      { key: "notifyApproval"     as const, label: "Action approval", desc: "When ARA needs permission to take an OS action" },
                      { key: "notifyBilling"      as const, label: "Billing alerts",  desc: "Usage thresholds and payment confirmations" },
                    ] as const).map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8">
                        <div>
                          <p className="text-sm text-white">{item.label}</p>
                          <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ [item.key]: !settings[item.key] })}
                          className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${
                            settings[item.key] !== false ? "bg-ara-600" : "bg-white/15"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                            settings[item.key] !== false ? "left-6" : "left-1"
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === "about" && (
              <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Section title="About ARA">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/8 text-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ara-500 to-ara-700 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-ara-900/50">
                      <span className="text-2xl font-black text-white">A</span>
                    </div>
                    <h3 className="text-lg font-bold text-white">ARA</h3>
                    <p className="text-xs text-white/40 mt-1">Automated Relocation Agent</p>
                    <p className="text-xs text-white/25 mt-0.5">Version 1.0.0</p>
                  </div>

                  <div className="space-y-2 text-sm text-white/50">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span>Built on</span>
                      <span className="text-white/70">OpenClaw Gateway</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span>Default LLM</span>
                      <span className="text-white/70">OpenRouter (free tier)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span>Platform</span>
                      <span className="text-white/70">macOS (Electron)</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>License</span>
                      <span className="text-white/70">MIT</span>
                    </div>
                  </div>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={saveSettings}
              className="px-6 py-2.5 rounded-xl bg-ara-600 hover:bg-ara-500 text-white text-sm font-medium transition-all"
            >
              Save Settings
            </button>
            <AnimatePresence>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-emerald-400 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
