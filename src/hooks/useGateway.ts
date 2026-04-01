import { useEffect, useCallback } from "react";
import { useAppStore } from "../store";

// ─── useGateway ───────────────────────────────────────────────────────────────
// Subscribes to all gateway IPC events and keeps the store in sync.
// Mount this once at the App root level.

export function useGateway() {
  const {
    setGatewayStatus,
    setSettings,
    addGatewayLog,
    setSessions,
    addSession,
    updateSession,
    addMessage,
    updateMessage,
    setCronJobs,
    setAgents,
  } = useAppStore();

  useEffect(() => {
    const ara = window.ara;

    // ── Initial state from main process ──────────────────────────────────────
    const unsubInitial = ara.on("store:initial", (data: unknown) => {
      const d = data as Record<string, unknown>;
      setSettings({
        onboardingComplete: d.onboardingComplete as boolean,
        activeProvider: d.activeProvider as string,
        activeModel: d.activeModel as string,
        hasOpenAIKey: d.hasOpenAIKey as boolean,
        hasAnthropicKey: d.hasAnthropicKey as boolean,
        hasGeminiKey: d.hasGeminiKey as boolean,
        gatewayPort: d.gatewayPort as number,
        gatewayToken: d.gatewayToken as string,
      });
    });

    // ── Gateway status ────────────────────────────────────────────────────────
    const unsubStatus = ara.on("gateway:status", (data: unknown) => {
      const d = data as { ready: boolean; port?: number; token?: string };
      setGatewayStatus({ ...d, connectedAt: d.ready ? Date.now() : undefined });
    });

    const unsubConnected = ara.on("gateway:connected", (data: unknown) => {
      const d = data as { port: number };
      setGatewayStatus({ ready: true, port: d.port, connectedAt: Date.now() });
      // Load initial data from gateway
      loadGatewayData();
    });

    const unsubDisconnected = ara.on("gateway:disconnected", () => {
      setGatewayStatus({ ready: false });
    });

    // ── Gateway logs ──────────────────────────────────────────────────────────
    const unsubLog = ara.on("gateway:log", (data: unknown) => {
      const d = data as { level: string; message: string };
      addGatewayLog(d);
    });

    // ── Gateway events (subscriptions) ───────────────────────────────────────
    const unsubEvent = ara.on("gateway:event", (data: unknown) => {
      const d = data as { method: string; params: unknown };
      handleGatewayEvent(d.method, d.params);
    });

    // Check initial gateway status
    ara.gateway.status().then((status: unknown) => {
      const s = status as { ready: boolean; port?: number; token?: string };
      setGatewayStatus(s);
      if (s.ready) loadGatewayData();
    });

    return () => {
      unsubInitial?.();
      unsubStatus?.();
      unsubConnected?.();
      unsubDisconnected?.();
      unsubLog?.();
      unsubEvent?.();
    };
  }, []);

  const loadGatewayData = useCallback(async () => {
    const ara = window.ara;

    // Load sessions
    try {
      const res = await ara.gateway.rpc("sessions.list", {
        limit: 50,
        includeDerivedTitles: true,
        includeLastMessage: true,
      });
      const r = res as { result?: unknown };
      if (r.result) {
        const sessions = (r.result as { sessions?: unknown[] }).sessions ?? [];
        setSessions(
          sessions.map((s: unknown) => {
            const sess = s as Record<string, unknown>;
            return {
              key: sess.key as string,
              id: sess.id as string | undefined,
              agentId: sess.agentId as string | undefined,
              label: sess.label as string | undefined,
              parentSessionKey: sess.parentSessionKey as string | undefined,
              createdAt: (sess.createdAtMs as number) ?? Date.now(),
              lastMessage: sess.lastMessage as string | undefined,
              status: "idle" as const,
              messages: [],
            };
          })
        );
      }
    } catch (err) {
      console.error("[Gateway] Failed to load sessions:", err);
    }

    // Load agents
    try {
      const res = await ara.gateway.rpc("agents.list", {});
      const r = res as { result?: unknown };
      if (r.result) {
        const agents = (r.result as { agents?: unknown[] }).agents ?? [];
        setAgents(
          agents.map((a: unknown) => {
            const agent = a as Record<string, unknown>;
            return {
              id: agent.id as string,
              name: agent.name as string,
              description: agent.description as string | undefined,
              model: agent.model as string | undefined,
              systemPrompt: agent.systemPrompt as string | undefined,
              isBuiltIn: agent.isBuiltIn as boolean | undefined,
            };
          })
        );
      }
    } catch (err) {
      console.error("[Gateway] Failed to load agents:", err);
    }

    // Load cron jobs
    try {
      const res = await ara.gateway.rpc("cron.list", {});
      const r = res as { result?: unknown };
      if (r.result) {
        const jobs = (r.result as { jobs?: unknown[] }).jobs ?? [];
        setCronJobs(
          jobs.map((j: unknown) => {
            const job = j as Record<string, unknown>;
            return {
              id: job.id as string,
              name: job.name as string,
              schedule: job.schedule as string,
              agentId: job.agentId as string | undefined,
              message: job.message as string,
              enabled: job.enabled as boolean,
              lastRunAt: job.lastRunAtMs as number | undefined,
              nextRunAt: job.nextRunAtMs as number | undefined,
              lastStatus: job.lastStatus as "ok" | "error" | "skipped" | undefined,
            };
          })
        );
      }
    } catch (err) {
      console.error("[Gateway] Failed to load cron jobs:", err);
    }
  }, [setSessions, setAgents, setCronJobs]);

  const handleGatewayEvent = useCallback(
    (method: string, params: unknown) => {
      const p = params as Record<string, unknown>;

      switch (method) {
        case "sessions.messages.subscribe": {
          // Streaming message chunk
          const sessionKey = p.key as string;
          const chunk = p.chunk as { id?: string; role?: string; content?: string; delta?: string };
          if (chunk?.delta) {
            // Streaming delta — update the last assistant message
            updateMessage(sessionKey, chunk.id ?? "streaming", {
              content: (chunk.content ?? "") + (chunk.delta ?? ""),
              isStreaming: true,
            });
          } else if (chunk?.role === "assistant" && chunk?.content) {
            addMessage(sessionKey, {
              id: chunk.id ?? `msg-${Date.now()}`,
              role: "assistant",
              content: chunk.content,
              timestamp: Date.now(),
              sessionKey,
              isStreaming: false,
            });
          }
          break;
        }

        case "sessions.patch": {
          const key = p.key as string;
          updateSession(key, { status: "idle" });
          break;
        }

        default:
          break;
      }
    },
    [addMessage, updateMessage, updateSession]
  );

  const rpc = useCallback(async (method: string, params?: unknown) => {
    const res = await window.ara.gateway.rpc(method, params);
    const r = res as { result?: unknown; error?: string };
    if (r.error) throw new Error(r.error);
    return r.result;
  }, []);

  const reconnect = useCallback(async () => {
    try {
      await window.ara.gateway.restart();
    } catch (err) {
      console.error("[Gateway] Reconnect failed:", err);
    }
  }, []);

  return { rpc, loadGatewayData, reconnect };
}
