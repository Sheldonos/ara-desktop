import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog, ipcMain } from "electron";
import log from "electron-log";

// ─── Configure ────────────────────────────────────────────────────────────────

autoUpdater.logger = log;
(autoUpdater.logger as typeof log).transports.file.level = "info";
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// GitHub Releases feed — electron-builder publishes update.yml here automatically
autoUpdater.setFeedURL({
  provider: "github",
  owner: "Sheldonos",
  repo: "ara-desktop",
  private: false,
});

// ─── IPC channels ─────────────────────────────────────────────────────────────

export type UpdateStatus =
  | { type: "checking" }
  | { type: "available"; version: string; releaseNotes: string }
  | { type: "not-available" }
  | { type: "downloading"; percent: number; bytesPerSecond: number }
  | { type: "downloaded"; version: string }
  | { type: "error"; message: string };

function broadcast(win: BrowserWindow | null, status: UpdateStatus) {
  if (win && !win.isDestroyed()) {
    win.webContents.send("update-status", status);
  }
}

// ─── Wire events ──────────────────────────────────────────────────────────────

export function initAutoUpdater(mainWindow: BrowserWindow | null) {
  autoUpdater.on("checking-for-update", () => {
    log.info("[Updater] Checking for update…");
    broadcast(mainWindow, { type: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    log.info("[Updater] Update available:", info.version);
    broadcast(mainWindow, {
      type: "available",
      version: info.version,
      releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : "",
    });
  });

  autoUpdater.on("update-not-available", () => {
    log.info("[Updater] App is up to date.");
    broadcast(mainWindow, { type: "not-available" });
  });

  autoUpdater.on("download-progress", (progress) => {
    log.info(`[Updater] Downloading: ${progress.percent.toFixed(1)}%`);
    broadcast(mainWindow, {
      type: "downloading",
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("[Updater] Update downloaded:", info.version);
    broadcast(mainWindow, { type: "downloaded", version: info.version });

    // Show a non-blocking dialog — user can choose to restart now or later
    dialog
      .showMessageBox({
        type: "info",
        title: "ARA Update Ready",
        message: `ARA ${info.version} has been downloaded.`,
        detail: "Restart ARA now to apply the update, or it will be installed automatically the next time you quit.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  autoUpdater.on("error", (err) => {
    log.error("[Updater] Error:", err);
    broadcast(mainWindow, { type: "error", message: err.message });
  });

  // IPC: renderer can request a manual update check
  ipcMain.handle("check-for-updates", async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      log.warn("[Updater] Manual check failed:", err);
    }
  });

  // IPC: renderer can trigger install-and-restart
  ipcMain.handle("install-update", () => {
    autoUpdater.quitAndInstall(false, true);
  });
}

// ─── Kick off on startup ──────────────────────────────────────────────────────

export function checkForUpdatesOnStartup(mainWindow: BrowserWindow | null) {
  // Wait 5 seconds after window is ready before checking — avoids blocking startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn("[Updater] Startup check failed (likely dev mode or no network):", err.message);
    });
  }, 5_000);
}
