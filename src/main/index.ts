import { app, BrowserWindow, ipcMain, nativeTheme, session } from "electron";
import { AutoStart } from "./autostart";
import { BadgeController } from "./badge";
import {
  APP_ID,
  DESKTOP_FILE_NAME,
  PRODUCT_NAME,
  ZALO_ACCEPT_LANGUAGES,
  ZALO_PARTITION,
  getChromeLinuxUserAgent,
  isDevelopment
} from "./config";
import { configureDownloads } from "./downloads";
import {
  configureKeyboardShortcuts,
  createApplicationMenu,
  MenuActions
} from "./menu";
import { configurePermissions } from "./permissions";
import { Store } from "./store";
import {
  createMainWindow,
  createSplashWindow,
  forceReload,
  isZaloWebContents,
  loadZalo,
  saveWindowState,
  showMainWindow,
  showOffline
} from "./window";
import { createTray } from "./tray";

let mainWindow: BrowserWindow | undefined;
let isQuitting = false;

function configureWayland(): void {
  if (process.platform !== "linux") {
    return;
  }

  if (process.env.ZALO_DESKTOP_FORCE_X11 === "1") {
    app.commandLine.appendSwitch("ozone-platform", "x11");
    return;
  }

  if (process.env.XDG_SESSION_TYPE === "wayland") {
    app.commandLine.appendSwitch("ozone-platform-hint", "auto");
    app.commandLine.appendSwitch("enable-features", "WaylandWindowDecorations");
  }
}

function focusExistingWindow(): void {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function configureAppIdentity(): void {
  app.setName(PRODUCT_NAME);
  app.setDesktopName(DESKTOP_FILE_NAME);
  app.setAppUserModelId(APP_ID);
  nativeTheme.themeSource = "system";
}

async function start(): Promise<void> {
  configureAppIdentity();

  const store = new Store();
  const autoStart = new AutoStart(store);
  autoStart.applySavedSetting();
  const zaloSession = session.fromPartition(ZALO_PARTITION);
  zaloSession.setUserAgent(getChromeLinuxUserAgent(), ZALO_ACCEPT_LANGUAGES);

  const splashWindow = createSplashWindow();
  mainWindow = createMainWindow(store, zaloSession);

  const actions: MenuActions = {
    reload: () => {
      if (!mainWindow) {
        return;
      }
      loadZalo(mainWindow);
    },
    forceReload: () => {
      if (mainWindow) {
        forceReload(mainWindow);
      }
    },
    quit: () => {
      isQuitting = true;
      app.quit();
    }
  };

  configurePermissions(zaloSession);
  configureDownloads(zaloSession, mainWindow);
  configureKeyboardShortcuts(mainWindow, store, actions);
  createApplicationMenu(mainWindow, store, autoStart, actions);

  const badge = new BadgeController(mainWindow);
  const tray = createTray(mainWindow, autoStart, {
    reload: actions.reload,
    toggleAutoStart: () => autoStart.toggle(),
    quit: actions.quit
  });
  badge.attachTray(tray);

  mainWindow.webContents.on("did-start-loading", () => {
    mainWindow?.setProgressBar(2);
  });

  mainWindow.webContents.on("did-stop-loading", () => {
    mainWindow?.setProgressBar(-1);
  });

  mainWindow.webContents.on("page-title-updated", (_event, title) => {
    badge.updateFromTitle(title);
  });

  mainWindow.webContents.on("did-finish-load", () => {
    if (mainWindow && isZaloWebContents(mainWindow.webContents)) {
      showMainWindow(mainWindow, splashWindow);
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, _errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) {
      return;
    }

    if (validatedUrl.startsWith("https://chat.zalo.me") && mainWindow) {
      showOffline(mainWindow, splashWindow);
    }
  });

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  ipcMain.on("app:reload-zalo", () => {
    if (mainWindow) {
      loadZalo(mainWindow);
    }
  });

  ipcMain.on("network:online", () => {
    if (mainWindow && !isZaloWebContents(mainWindow.webContents)) {
      loadZalo(mainWindow);
    }
  });

  loadZalo(mainWindow, splashWindow);
}

configureWayland();

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", focusExistingWindow);

  app.whenReady().then(start).catch((error) => {
    if (isDevelopment()) {
      console.error(error);
    }
    app.quit();
  });
}

app.on("before-quit", () => {
  isQuitting = true;
  if (mainWindow) {
    saveWindowState(mainWindow, new Store());
  }
});

app.on("activate", focusExistingWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "linux") {
    app.quit();
  }
});
