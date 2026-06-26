import { BrowserWindow, Session, WebContents, app, shell } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  PRODUCT_NAME,
  ZALO_ACCEPT_LANGUAGES,
  ZALO_PARTITION,
  ZALO_URL,
  getIconPath,
  getChromeLinuxUserAgent,
  getRendererPath,
  isTrustedZaloUrl
} from "./config";
import { attachLoginDiagnostics } from "./loginDiagnostics";
import { Store } from "./store";

export interface AppWindows {
  mainWindow: BrowserWindow;
  splashWindow: BrowserWindow;
}

export function isAllowedInAppUrl(url: string): boolean {
  return isTrustedZaloUrl(url);
}

function openExternalSafely(url: string): void {
  try {
    const parsed = new URL(url);
    if (!["https:", "http:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return;
    }

    shell.openExternal(url).catch(() => undefined);
  } catch {
    // Ignore malformed URLs.
  }
}

function showWindow(mainWindow: BrowserWindow): void {
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function getSplashUrl(state: "loading" | "offline" = "loading"): string {
  const splashPath = getRendererPath("splash.html");
  const splashUrl = pathToFileURL(splashPath);
  splashUrl.searchParams.set("state", state);
  return splashUrl.toString();
}

function getZaloWebPreferences(zaloSession: Session): Electron.WebPreferences {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    webSecurity: true,
    session: zaloSession,
    partition: ZALO_PARTITION,
    webviewTag: false,
    spellcheck: true,
    preload: path.join(app.getAppPath(), "out", "preload", "index.js")
  };
}

function configureZaloWebContents(
  label: string,
  ownerWindow: BrowserWindow,
  zaloSession: Session,
  webContents: WebContents
): void {
  const userAgent = getChromeLinuxUserAgent();

  webContents.session.setUserAgent(userAgent, ZALO_ACCEPT_LANGUAGES);
  webContents.setUserAgent(userAgent);
  webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedInAppUrl(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          parent: ownerWindow,
          width: 680,
          height: 760,
          minWidth: 520,
          minHeight: 560,
          show: true,
          title: PRODUCT_NAME,
          icon: getIconPath(256),
          webPreferences: getZaloWebPreferences(zaloSession)
        }
      };
    }

    openExternalSafely(url);
    return { action: "deny" };
  });

  webContents.on("did-create-window", (childWindow) => {
    configureZaloWebContents("popup", childWindow, zaloSession, childWindow.webContents);
  });

  webContents.on("will-navigate", (event) => {
    if (!event.isMainFrame || isAllowedInAppUrl(event.url)) {
      return;
    }

    event.preventDefault();
    openExternalSafely(event.url);
  });

  webContents.on("will-redirect", (event) => {
    if (!event.isMainFrame || isAllowedInAppUrl(event.url)) {
      return;
    }

    event.preventDefault();
    openExternalSafely(event.url);
  });

  attachLoginDiagnostics(label, ownerWindow, webContents);
}

export function createSplashWindow(): BrowserWindow {
  const splashWindow = new BrowserWindow({
    width: 420,
    height: 300,
    resizable: false,
    frame: false,
    show: false,
    alwaysOnTop: false,
    backgroundColor: "#f6f4ee",
    icon: getIconPath(256),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false,
      preload: path.join(app.getAppPath(), "out", "preload", "index.js")
    }
  });

  splashWindow.loadURL(getSplashUrl());
  splashWindow.once("ready-to-show", () => splashWindow.show());
  return splashWindow;
}

export function createMainWindow(store: Store, zaloSession: Session): BrowserWindow {
  const state = store.get("windowState");
  const mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    backgroundColor: "#f7f7f5",
    title: PRODUCT_NAME,
    icon: getIconPath(256),
    webPreferences: getZaloWebPreferences(zaloSession)
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.webContents.setZoomFactor(store.get("zoomFactor"));
  configureZaloWebContents("main", mainWindow, zaloSession, mainWindow.webContents);

  mainWindow.on("resize", () => saveWindowState(mainWindow, store));
  mainWindow.on("move", () => saveWindowState(mainWindow, store));
  mainWindow.on("maximize", () => store.updateWindowState({ isMaximized: true }));
  mainWindow.on("unmaximize", () => store.updateWindowState({ isMaximized: false }));

  return mainWindow;
}

export function saveWindowState(mainWindow: BrowserWindow, store: Store): void {
  if (mainWindow.isDestroyed() || mainWindow.isMaximized() || mainWindow.isMinimized()) {
    return;
  }

  const bounds = mainWindow.getBounds();
  store.updateWindowState({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: false
  });
}

export function loadZalo(mainWindow: BrowserWindow, splashWindow?: BrowserWindow): void {
  mainWindow.setProgressBar(2);
  mainWindow.loadURL(ZALO_URL, { userAgent: getChromeLinuxUserAgent() }).catch(() => {
    mainWindow.setProgressBar(-1);
    showOffline(mainWindow, splashWindow);
  });
}

export function forceReload(mainWindow: BrowserWindow): void {
  const session = mainWindow.webContents.session;
  session.clearCache().finally(() => {
    mainWindow.webContents.reloadIgnoringCache();
  });
}

export function showMainWindow(mainWindow: BrowserWindow, splashWindow?: BrowserWindow): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  showWindow(mainWindow);
}

export function showOffline(mainWindow: BrowserWindow, splashWindow?: BrowserWindow): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }

  mainWindow.loadURL(getSplashUrl("offline")).finally(() => {
    showWindow(mainWindow);
  });
}

export function isZaloWebContents(webContents: WebContents): boolean {
  return isAllowedInAppUrl(webContents.getURL());
}
