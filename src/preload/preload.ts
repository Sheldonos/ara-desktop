import { contextBridge, ipcRenderer } from "electron";

// ─── ARA API exposed to the renderer via contextBridge ────────────────────────
// This is the ONLY way the renderer can communicate with the main process.
// All methods are explicitly whitelisted here for security.

const araAPI = {
  // Store
  store: {
    get: (key: string) => ipcRenderer.invoke("store:get", key),
    set: (key: string, value: unknown) => ipcRenderer.invoke("store:set", key, value),
  },

  // Gateway
  gateway: {
    status: () => ipcRenderer.invoke("gateway:status"),
    restart: () => ipcRenderer.invoke("gateway:restart"),
    rpc: (method: string, params?: unknown) => ipcRenderer.invoke("gateway:rpc", method, params),
  },

  // Settings
  settings: {
    save: (settings: Record<string, string>) => ipcRenderer.invoke("settings:save", settings),
  },

  // Onboarding
  onboarding: {
    complete: () => ipcRenderer.invoke("onboarding:complete"),
  },

  // Shell
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  },

  // Notifications
  notify: (title: string, body: string) => ipcRenderer.invoke("notify", title, body),

  // Dialog
  dialog: {
    open: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke("dialog:open", options),
  },

  // Event listeners (renderer subscribes to main process events)
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowedChannels = [
      "gateway:status",
      "gateway:connected",
      "gateway:disconnected",
      "gateway:log",
      "gateway:event",
      "gateway:event:sessions.messages.subscribe",
      "store:initial",
      "navigate",
      "tray:refresh",
    ];

    if (!allowedChannels.includes(channel) && !channel.startsWith("gateway:event:")) {
      console.warn(`[Preload] Blocked subscription to channel: ${channel}`);
      return () => {};
    }

    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, subscription);

    // Return unsubscribe function
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  // One-time listener
  once: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.once(channel, (_event, ...args) => callback(...args));
  },

  // Platform info
  platform: process.platform,
  isDev: process.env.NODE_ENV === "development",
};

contextBridge.exposeInMainWorld("ara", araAPI);

// Type declaration for TypeScript in renderer
export type AraAPI = typeof araAPI;
