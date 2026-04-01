import WebSocket from "ws";
import { BrowserWindow } from "electron";

interface RpcRequest {
  id: number;
  method: string;
  params: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class GatewayBridge {
  private ws: WebSocket | null = null;
  private port: number;
  private token: string;
  private requestId = 1;
  private pendingRequests = new Map<number, RpcRequest>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private connected = false;
  private subscriptions = new Set<string>();

  constructor(port: number, token: string) {
    this.port = port;
    this.token = token;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = `ws://localhost:${this.port}/api/gateway?token=${this.token}`;
    console.log(`[Bridge] Connecting to ${url}`);

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error("[Bridge] Failed to create WebSocket:", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      console.log("[Bridge] Connected to OpenClaw gateway");
      this.connected = true;
      this.reconnectAttempts = 0;
      this.broadcastToRenderer("gateway:connected", { port: this.port });

      // Re-subscribe to any active subscriptions
      for (const sub of this.subscriptions) {
        this.resubscribe(sub);
      }
    });

    this.ws.on("message", (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString()) as {
          id?: number;
          method?: string;
          result?: unknown;
          error?: { message: string; code?: number };
          params?: unknown;
        };

        if (msg.id !== undefined) {
          // Response to a pending RPC call
          const pending = this.pendingRequests.get(msg.id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(msg.id);
            if (msg.error) {
              pending.reject(new Error(msg.error.message));
            } else {
              pending.resolve(msg.result);
            }
          }
        } else if (msg.method) {
          // Server-sent event / subscription update
          this.broadcastToRenderer(`gateway:event:${msg.method}`, msg.params);
          // Also send a generic event for the renderer to handle
          this.broadcastToRenderer("gateway:event", { method: msg.method, params: msg.params });
        }
      } catch (err) {
        console.error("[Bridge] Failed to parse message:", err);
      }
    });

    this.ws.on("close", (code, reason) => {
      console.log(`[Bridge] Disconnected (${code}: ${reason})`);
      this.connected = false;
      this.ws = null;
      this.broadcastToRenderer("gateway:disconnected", { code });
      this.scheduleReconnect();
    });

    this.ws.on("error", (err) => {
      console.error("[Bridge] WebSocket error:", err.message);
      // Don't broadcast every error — the close event will handle reconnect
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.maxReconnectAttempts = 0; // Stop reconnecting
    this.ws?.close();
    this.ws = null;
    this.connected = false;

    // Reject all pending requests
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timeout);
      req.reject(new Error("Gateway disconnected"));
    }
    this.pendingRequests.clear();
  }

  async call(method: string, params: unknown = {}): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Gateway not connected");
    }

    const id = this.requestId++;
    const message = JSON.stringify({ id, method, params });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Gateway RPC timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, { id, method, params, resolve, reject, timeout });
      this.ws!.send(message);
    });
  }

  subscribe(topic: string): void {
    this.subscriptions.add(topic);
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
  }

  private resubscribe(topic: string): void {
    // Re-send subscription requests after reconnect
    if (topic.startsWith("sessions:")) {
      const key = topic.replace("sessions:", "");
      this.call("sessions.messages.subscribe", { key }).catch(console.error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[Bridge] Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    console.log(`[Bridge] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private broadcastToRenderer(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }
}
