"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// ─── ARA API exposed to the renderer via contextBridge ────────────────────────
// This is the ONLY way the renderer can communicate with the main process.
// All methods are explicitly whitelisted here for security.
const araAPI = {
    // Store
    store: {
        get: (key) => electron_1.ipcRenderer.invoke("store:get", key),
        set: (key, value) => electron_1.ipcRenderer.invoke("store:set", key, value),
    },
    // Gateway
    gateway: {
        status: () => electron_1.ipcRenderer.invoke("gateway:status"),
        restart: () => electron_1.ipcRenderer.invoke("gateway:restart"),
        rpc: (method, params) => electron_1.ipcRenderer.invoke("gateway:rpc", method, params),
    },
    // Settings
    settings: {
        save: (settings) => electron_1.ipcRenderer.invoke("settings:save", settings),
    },
    // Onboarding
    onboarding: {
        complete: () => electron_1.ipcRenderer.invoke("onboarding:complete"),
    },
    // Shell
    shell: {
        openExternal: (url) => electron_1.ipcRenderer.invoke("shell:openExternal", url),
    },
    // Notifications
    notify: (title, body) => electron_1.ipcRenderer.invoke("notify", title, body),
    // Dialog
    dialog: {
        open: (options) => electron_1.ipcRenderer.invoke("dialog:open", options),
    },
    // Event listeners (renderer subscribes to main process events)
    on: (channel, callback) => {
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
            return () => { };
        }
        const subscription = (_event, ...args) => callback(...args);
        electron_1.ipcRenderer.on(channel, subscription);
        // Return unsubscribe function
        return () => electron_1.ipcRenderer.removeListener(channel, subscription);
    },
    // One-time listener
    once: (channel, callback) => {
        electron_1.ipcRenderer.once(channel, (_event, ...args) => callback(...args));
    },
    // Platform info
    platform: process.platform,
    isDev: process.env.NODE_ENV === "development",
};
electron_1.contextBridge.exposeInMainWorld("ara", araAPI);
