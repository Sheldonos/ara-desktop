import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  shell,
  dialog,
  Notification,
} from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import Store from "electron-store";
import { GatewayBridge } from "./gateway-bridge";
import { initAutoUpdater, checkForUpdatesOnStartup } from "./updater";

// ─── Store (persists user settings across restarts) ───────────────────────────
const store = new Store<{
  onboardingComplete: boolean;
  gatewayToken: string;
  openrouterKey: string;
  openaiKey: string;
  anthropicKey: string;
  geminiKey: string;
  activeProvider: string;
  activeModel: string;
  windowBounds: { x: number; y: number; width: number; height: number };
  gatewayPort: number;
}>({
  defaults: {
    onboardingComplete: false,
    gatewayToken: generateToken(),
    openrouterKey: "sk-or-v1-ara-free-tier-placeholder",
    openaiKey: "",
    anthropicKey: "",
    geminiKey: "",
    activeProvider: "openrouter",
    activeModel: "meta-llama/llama-3.3-70b-instruct:free",
    windowBounds: { x: 0, y: 0, width: 1280, height: 800 },
    gatewayPort: 18789,
  },
});

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "ara-";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ─── Global state ─────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let gatewayProcess: ChildProcess | null = null;
let gatewayBridge: GatewayBridge | null = null;
let gatewayReady = false;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const GATEWAY_PORT = store.get("gatewayPort");
const GATEWAY_TOKEN = store.get("gatewayToken");

// ─── OpenClaw Gateway path resolution ─────────────────────────────────────────
function getOpenClawPath(): string {
  if (isDev) {
    // In development, use the globally installed openclaw or the vendor copy
    const vendorPath = path.join(__dirname, "../../vendor/openclaw/openclaw.mjs");
    if (fs.existsSync(vendorPath)) return vendorPath;
    // Fall back to npx openclaw (requires internet, for dev only)
    return "openclaw";
  }
  // In production, use the bundled copy from extraResources
  return path.join(process.resourcesPath, "openclaw", "openclaw.mjs");
}

// ─── Gateway subprocess management ────────────────────────────────────────────
async function startGateway(): Promise<void> {
  if (gatewayProcess) return;

  const openclawPath = getOpenClawPath();
  const stateDir = path.join(app.getPath("userData"), "openclaw-state");
  fs.mkdirSync(stateDir, { recursive: true });

  // Build the openclaw config for this session
  const configPath = path.join(stateDir, "openclaw.json");
  const config = buildOpenClawConfig();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPENCLAW_GATEWAY_TOKEN: GATEWAY_TOKEN,
    OPENCLAW_STATE_DIR: stateDir,
    OPENCLAW_CONFIG_PATH: configPath,
    OPENROUTER_API_KEY: store.get("openrouterKey"),
    OPENAI_API_KEY: store.get("openaiKey") || undefined,
    ANTHROPIC_API_KEY: store.get("anthropicKey") || undefined,
    GEMINI_API_KEY: store.get("geminiKey") || undefined,
    NODE_ENV: "production",
  };

  const args = ["gateway", "--port", String(GATEWAY_PORT), "--no-open"];

  console.log(`[ARA] Starting OpenClaw gateway on port ${GATEWAY_PORT}`);

  try {
    if (openclawPath === "openclaw") {
      // Dev mode: use npx
      gatewayProcess = spawn("npx", ["openclaw@latest", ...args], { env, shell: true });
    } else if (openclawPath.endsWith(".mjs")) {
      gatewayProcess = spawn("node", [openclawPath, ...args], { env });
    } else {
      gatewayProcess = spawn(openclawPath, args, { env });
    }
  } catch (err) {
    console.error("[ARA] Failed to start gateway:", err);
    // Start in mock mode for UI development
    startMockGateway();
    return;
  }

  gatewayProcess.stdout?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    console.log(`[Gateway] ${line}`);
    if (line.includes("Server running") || line.includes("listening")) {
      onGatewayReady();
    }
    mainWindow?.webContents.send("gateway:log", { level: "info", message: line });
  });

  gatewayProcess.stderr?.on("data", (data: Buffer) => {
    const line = data.toString().trim();
    console.error(`[Gateway:err] ${line}`);
    mainWindow?.webContents.send("gateway:log", { level: "error", message: line });
  });

  gatewayProcess.on("exit", (code) => {
    console.log(`[ARA] Gateway exited with code ${code}`);
    gatewayReady = false;
    gatewayProcess = null;
    mainWindow?.webContents.send("gateway:status", { ready: false, code });
  });

  // Give the gateway 8 seconds to start, then connect anyway
  setTimeout(() => {
    if (!gatewayReady) onGatewayReady();
  }, 8000);
}

function startMockGateway(): void {
  console.log("[ARA] Starting in mock/demo mode (no OpenClaw binary found)");
  setTimeout(() => onGatewayReady(), 1000);
}

function buildOpenClawConfig(): Record<string, unknown> {
  const provider = store.get("activeProvider");
  const model = store.get("activeModel");

  return {
    gateway: {
      port: GATEWAY_PORT,
      auth: { token: GATEWAY_TOKEN },
    },
    agents: {
      defaults: {
        model: {
          primary: model,
          provider: provider === "openrouter" ? "openrouter" : provider,
        },
      },
    },
    messages: {
      tts: {
        enabled: false,
        provider: "openai",
      },
    },
  };
}

function onGatewayReady(): void {
  if (gatewayReady) return;
  gatewayReady = true;
  console.log("[ARA] Gateway ready — connecting bridge");

  gatewayBridge = new GatewayBridge(GATEWAY_PORT, GATEWAY_TOKEN);
  gatewayBridge.connect();

  mainWindow?.webContents.send("gateway:status", {
    ready: true,
    port: GATEWAY_PORT,
    token: GATEWAY_TOKEN,
  });
}

function stopGateway(): void {
  gatewayBridge?.disconnect();
  gatewayBridge = null;
  if (gatewayProcess) {
    gatewayProcess.kill("SIGTERM");
    gatewayProcess = null;
  }
  gatewayReady = false;
}

// ─── Window creation ──────────────────────────────────────────────────────────
function createWindow(): void {
  const bounds = store.get("windowBounds");

  mainWindow = new BrowserWindow({
    x: bounds.x || undefined,
    y: bounds.y || undefined,
    width: bounds.width,
    height: bounds.height,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#0f0f14",
    vibrancy: "under-window",
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev,
    },
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    // Send initial state
    mainWindow?.webContents.send("store:initial", {
      onboardingComplete: store.get("onboardingComplete"),
      activeProvider: store.get("activeProvider"),
      activeModel: store.get("activeModel"),
      hasOpenAIKey: !!store.get("openaiKey"),
      hasAnthropicKey: !!store.get("anthropicKey"),
      hasGeminiKey: !!store.get("geminiKey"),
      gatewayPort: GATEWAY_PORT,
      gatewayToken: GATEWAY_TOKEN,
    });
  });

  mainWindow.on("close", (e) => {
    if (process.platform === "darwin") {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("moved", saveWindowBounds);
  mainWindow.on("resized", saveWindowBounds);
}

function saveWindowBounds(): void {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  store.set("windowBounds", bounds);
}

// ─── Tray (menu-bar icon) ─────────────────────────────────────────────────────
function createTray(): void {
  const iconPath = path.join(__dirname, "../../assets/tray-icon.png");
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip("ARA — AI Relocation Agent");

  const updateMenu = () => {
    const menu = Menu.buildFromTemplate([
      {
        label: "Open ARA",
        click: () => { mainWindow?.show(); mainWindow?.focus(); },
      },
      { type: "separator" },
      {
        label: gatewayReady ? "● Gateway Running" : "○ Gateway Starting...",
        enabled: false,
      },
      {
        label: `Model: ${store.get("activeModel").split("/").pop()}`,
        enabled: false,
      },
      { type: "separator" },
      {
        label: "New Relocation",
        click: () => {
          mainWindow?.show();
          mainWindow?.webContents.send("navigate", "/relocations/new");
        },
      },
      {
        label: "Voice Agent",
        click: () => {
          mainWindow?.show();
          mainWindow?.webContents.send("navigate", "/voice");
        },
      },
      { type: "separator" },
      {
        label: "Quit ARA",
        click: () => {
          stopGateway();
          app.exit(0);
        },
      },
    ]);
    tray?.setContextMenu(menu);
  };

  updateMenu();
  tray.on("click", () => { mainWindow?.show(); mainWindow?.focus(); });

  // Refresh tray menu when gateway status changes
  ipcMain.on("tray:refresh", updateMenu);
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
function registerIpcHandlers(): void {
  // Store read/write
  ipcMain.handle("store:get", (_e, key: string) => store.get(key as never));
  ipcMain.handle("store:set", (_e, key: string, value: unknown) => {
    store.set(key as never, value as never);
    return true;
  });

  // Gateway status
  ipcMain.handle("gateway:status", () => ({
    ready: gatewayReady,
    port: GATEWAY_PORT,
    token: GATEWAY_TOKEN,
  }));

  // Gateway restart
  ipcMain.handle("gateway:restart", async () => {
    stopGateway();
    await new Promise((r) => setTimeout(r, 1500));
    await startGateway();
    return { ok: true };
  });

  // Gateway RPC passthrough (renderer → main → gateway WS)
  ipcMain.handle("gateway:rpc", async (_e, method: string, params: unknown) => {
    if (!gatewayBridge) {
      return { error: "Gateway not connected" };
    }
    try {
      const result = await gatewayBridge.call(method, params);
      return { result };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  // Settings update — rebuild config and restart gateway
  ipcMain.handle("settings:save", async (_e, settings: {
    openrouterKey?: string;
    openaiKey?: string;
    anthropicKey?: string;
    geminiKey?: string;
    activeProvider?: string;
    activeModel?: string;
  }) => {
    if (settings.openrouterKey !== undefined) store.set("openrouterKey", settings.openrouterKey);
    if (settings.openaiKey !== undefined) store.set("openaiKey", settings.openaiKey);
    if (settings.anthropicKey !== undefined) store.set("anthropicKey", settings.anthropicKey);
    if (settings.geminiKey !== undefined) store.set("geminiKey", settings.geminiKey);
    if (settings.activeProvider !== undefined) store.set("activeProvider", settings.activeProvider);
    if (settings.activeModel !== undefined) store.set("activeModel", settings.activeModel);
    return { ok: true };
  });

  // Onboarding complete
  ipcMain.handle("onboarding:complete", () => {
    store.set("onboardingComplete", true);
    return { ok: true };
  });

  // Open external URL
  ipcMain.handle("shell:openExternal", (_e, url: string) => shell.openExternal(url));

  // Show notification
  ipcMain.handle("notify", (_e, title: string, body: string) => {
    new Notification({ title, body }).show();
  });

  // File dialog
  ipcMain.handle("dialog:open", async (_e, options) => {
    return dialog.showOpenDialog(mainWindow!, options);
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  registerIpcHandlers();
  createWindow();
  createTray();
  await startGateway();

  // Auto-updater: only active in packaged builds (not dev mode)
  if (app.isPackaged) {
    initAutoUpdater(mainWindow);
    checkForUpdatesOnStartup(mainWindow);
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on("window-all-closed", () => {
  // On macOS, keep app running in tray
  if (process.platform !== "darwin") {
    stopGateway();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopGateway();
});

app.on("will-quit", () => {
  stopGateway();
});
