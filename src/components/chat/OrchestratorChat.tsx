import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Plus, Bot, User, Loader2, ChevronDown,
  Wrench, GitBranch, Trash2, MoreHorizontal, Sparkles,
  Copy, RefreshCw, AlertCircle
} from "lucide-react";
import { useAppStore, type Message, type Session } from "../../store";
import { useGateway } from "../../hooks/useGateway";

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const [copied, setCopied] = useState(false);

  const copyContent = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 group ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 ${
          isUser
            ? "bg-ara-700"
            : "bg-gradient-to-br from-ara-500 to-ara-700"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-ara-600 text-white rounded-tr-sm"
              : "bg-white/8 text-white/90 rounded-tl-sm border border-white/8"
          }`}
        >
          {message.isStreaming ? (
            <span>
              {message.content}
              <span className="inline-flex gap-0.5 ml-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 bg-white/50 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </span>
          ) : (
            <MessageContent content={message.content} />
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1.5 w-full">
            {message.toolCalls.map((tc) => (
              <div
                key={tc.id}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-xs"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-white/70 font-mono">{tc.name}</span>
                <div className="ml-auto">
                  {tc.status === "running" && (
                    <Loader2 className="w-3 h-3 text-ara-400 animate-spin" />
                  )}
                  {tc.status === "done" && (
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  )}
                  {tc.status === "error" && (
                    <AlertCircle className="w-3 h-3 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp + actions */}
        <div
          className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isUser ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span className="text-xs text-white/25">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={copyContent}
            className="text-white/25 hover:text-white/60 transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
          {copied && (
            <span className="text-xs text-emerald-400">Copied</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Simple markdown-lite renderer
function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h3 key={i} className="font-bold text-base">{line.slice(2)}</h3>;
        if (line.startsWith("## ")) return <h4 key={i} className="font-semibold">{line.slice(3)}</h4>;
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-ara-400 mt-0.5">•</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (line.startsWith("```")) return null;
        if (line === "") return <div key={i} className="h-2" />;
        // Bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </div>
  );
}

// ─── Sub-agent badge ──────────────────────────────────────────────────────────

function SubAgentBadge({ session }: { session: Session }) {
  const { setActiveSession } = useAppStore();
  return (
    <button
      onClick={() => setActiveSession(session.key)}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ara-900/50 border border-ara-700/50 text-xs text-ara-300 hover:bg-ara-800/50 transition-colors"
    >
      <GitBranch className="w-3 h-3" />
      <span className="truncate max-w-[100px]">{session.label ?? session.key.slice(0, 8)}</span>
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          session.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-white/20"
        }`}
      />
    </button>
  );
}

// ─── Session list item ────────────────────────────────────────────────────────

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive
          ? "bg-ara-900/60 border border-ara-700/50"
          : "hover:bg-white/5 border border-transparent"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isActive ? "bg-ara-600" : "bg-white/8"
        }`}
      >
        <Bot className="w-4 h-4 text-white/70" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 truncate">
          {session.label ?? `Session ${session.key.slice(0, 6)}`}
        </p>
        {session.lastMessage && (
          <p className="text-xs text-white/35 truncate mt-0.5">{session.lastMessage}</p>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main OrchestratorChat component ─────────────────────────────────────────

export function OrchestratorChat() {
  const {
    sessions,
    activeSessionKey,
    setActiveSession,
    addSession,
    updateSession,
    addMessage,
    agents,
    gateway,
  } = useAppStore();

  const { rpc } = useGateway();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSessions, setShowSessions] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("default");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find((s) => s.key === activeSessionKey);
  const childSessions = sessions.filter(
    (s) => s.parentSessionKey === activeSessionKey
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const createSession = useCallback(async () => {
    if (!gateway.ready) return;
    try {
      const result = await rpc("sessions.create", {
        agentId: selectedAgent !== "default" ? selectedAgent : undefined,
        label: `Chat ${new Date().toLocaleTimeString()}`,
      }) as { key: string };

      const newSession: Session = {
        key: result.key,
        label: `Chat ${new Date().toLocaleTimeString()}`,
        createdAt: Date.now(),
        status: "idle",
        messages: [],
      };
      addSession(newSession);
      setActiveSession(result.key);
    } catch (err) {
      console.error("Failed to create session:", err);
      // Create a local demo session if gateway isn't available
      const demoKey = `demo-${Date.now()}`;
      addSession({
        key: demoKey,
        label: `Chat ${new Date().toLocaleTimeString()}`,
        createdAt: Date.now(),
        status: "idle",
        messages: [
          {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm ARA, your AI relocation agent. I can help you coordinate your move — from utility transfers to address changes. What would you like to do today?",
            timestamp: Date.now(),
          },
        ],
      });
      setActiveSession(demoKey);
    }
  }, [gateway.ready, selectedAgent, rpc, addSession, setActiveSession]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;

    const content = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";

    // Create session if none active
    let sessionKey = activeSessionKey;
    if (!sessionKey) {
      await createSession();
      sessionKey = useAppStore.getState().activeSessionKey;
      if (!sessionKey) return;
    }

    // Add user message immediately
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
      sessionKey,
    };
    addMessage(sessionKey, userMsg);
    updateSession(sessionKey, { status: "active" });
    setSending(true);

    // Add streaming placeholder
    const streamId = `stream-${Date.now()}`;
    addMessage(sessionKey, {
      id: streamId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      sessionKey,
      isStreaming: true,
    });

    try {
      if (gateway.ready) {
        // Send via OpenClaw gateway
        await rpc("sessions.send", {
          key: sessionKey,
          message: content,
          stream: true,
        });
        // Response will come via gateway:event subscription
      } else {
        // Demo mode — simulate a response
        await simulateDemoResponse(sessionKey, streamId, content);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      const { updateMessage } = useAppStore.getState();
      updateMessage(sessionKey, streamId, {
        content: "I encountered an error. Please check that the AI gateway is running.",
        isStreaming: false,
      });
    } finally {
      setSending(false);
      updateSession(sessionKey, { status: "idle" });
    }
  }, [input, sending, activeSessionKey, gateway.ready, rpc, addMessage, updateSession, createSession]);

  const simulateDemoResponse = async (
    sessionKey: string,
    streamId: string,
    userMessage: string
  ) => {
    const { updateMessage } = useAppStore.getState();
    const responses: Record<string, string> = {
      default: "I understand you'd like help with your relocation. I can coordinate utility transfers, USPS address changes, DMV updates, and more. To get started, could you tell me your current address and your new address?",
    };

    const lower = userMessage.toLowerCase();
    let response = responses.default;
    if (lower.includes("utility") || lower.includes("electric") || lower.includes("gas")) {
      response = "I'll handle your utility transfers. I'll contact your current providers to schedule disconnection and set up new service at your destination. This typically takes 2-3 business days. Shall I proceed?";
    } else if (lower.includes("address") || lower.includes("usps") || lower.includes("mail")) {
      response = "I can submit a USPS mail forwarding request on your behalf. This will redirect all mail from your old address to your new address for up to 12 months. I'll need your move date — when are you planning to move?";
    } else if (lower.includes("dmv") || lower.includes("license") || lower.includes("registration")) {
      response = "I'll help update your driver's license and vehicle registration with the DMV. Most states require this within 30 days of moving. I'll prepare the forms and can submit them electronically where available.";
    }

    // Simulate streaming
    const words = response.split(" ");
    let current = "";
    for (const word of words) {
      current += (current ? " " : "") + word;
      updateMessage(sessionKey, streamId, { content: current, isStreaming: true });
      await new Promise((r) => setTimeout(r, 40));
    }
    updateMessage(sessionKey, streamId, { content: current, isStreaming: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const deleteSession = async (key: string) => {
    try {
      await rpc("sessions.delete", { key });
    } catch {}
    const { sessions, setActiveSession, setSessions } = useAppStore.getState();
    const remaining = sessions.filter((s) => s.key !== key);
    setSessions(remaining);
    if (activeSessionKey === key) {
      setActiveSession(remaining[0]?.key ?? null);
    }
  };

  return (
    <div className="flex h-full bg-surface">
      {/* Session sidebar */}
      <AnimatePresence>
        {showSessions && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-white/8 flex flex-col overflow-hidden"
          >
            <div className="p-3 border-b border-white/8">
              <button
                onClick={createSession}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-ara-600 hover:bg-ara-500 text-white text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                New chat
              </button>
            </div>

            {/* Agent selector */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Agent</p>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-ara-500"
              >
                <option value="default">Lead Orchestrator</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/30">No conversations yet</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <SessionItem
                    key={session.key}
                    session={session}
                    isActive={session.key === activeSessionKey}
                    onSelect={() => setActiveSession(session.key)}
                    onDelete={() => deleteSession(session.key)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-white truncate">
              {activeSession?.label ?? "Lead Orchestrator"}
            </h2>
            {childSessions.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <GitBranch className="w-3 h-3 text-white/30" />
                <span className="text-xs text-white/30">
                  {childSessions.length} sub-agent{childSessions.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          {/* Sub-agent badges */}
          {childSessions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {childSessions.slice(0, 3).map((s) => (
                <SubAgentBadge key={s.key} session={s} />
              ))}
              {childSessions.length > 3 && (
                <span className="text-xs text-white/30">+{childSessions.length - 3}</span>
              )}
            </div>
          )}

          {/* Gateway status */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                gateway.ready
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="text-xs text-white/30">
              {gateway.ready ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!activeSession ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ara-500 to-ara-700 flex items-center justify-center mb-4 shadow-xl shadow-ara-900/50">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Start a conversation
              </h3>
              <p className="text-white/40 text-sm max-w-xs mb-6">
                Ask ARA anything about your move. It can coordinate vendors,
                draft notifications, and take action on your behalf.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {[
                  "Help me plan my move from NYC to LA",
                  "Transfer my utilities to new address",
                  "Update my address with USPS",
                  "What tasks are pending for my move?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="text-left px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-xs text-white/60 hover:text-white/80 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeSession.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="px-4 pb-4 pt-2 border-t border-white/8">
          <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-ara-500/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                gateway.ready
                  ? "Message ARA... (Enter to send, Shift+Enter for new line)"
                  : "Gateway starting up..."
              }
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/25 resize-none focus:outline-none min-h-[24px] max-h-[160px] leading-relaxed"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-8 h-8 rounded-xl bg-ara-600 hover:bg-ara-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <p className="text-xs text-white/20 mt-1.5 text-center">
            ARA can make mistakes. Review important actions before approving.
          </p>
        </div>
      </div>
    </div>
  );
}
