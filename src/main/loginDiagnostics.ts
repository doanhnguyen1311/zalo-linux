import { BrowserWindow, WebContents } from "electron";
import { isDevelopment } from "./config";

const attachedWebContents = new WeakSet<WebContents>();

function isEnabled(): boolean {
  return isDevelopment() || process.env.ZALO_DESKTOP_DEBUG_LOGIN === "1";
}

function summarizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

async function dumpCookies(label: string, webContents: WebContents): Promise<void> {
  const cookies = await webContents.session.cookies.get({});
  const summary = cookies.map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    session: cookie.session,
    sameSite: cookie.sameSite,
    expires: cookie.expirationDate
  }));

  console.info(`[login:${label}] cookies`, summary);
}

async function dumpStorage(label: string, webContents: WebContents): Promise<void> {
  if (webContents.isDestroyed()) {
    return;
  }

  const storage = await webContents.executeJavaScript(
    `(() => ({
      href: location.href,
      localStorageKeys: Object.keys(localStorage),
      sessionStorageKeys: Object.keys(sessionStorage),
      indexedDBDatabases: indexedDB.databases ? indexedDB.databases() : Promise.resolve([])
    }))()`,
    true
  );

  console.info(`[login:${label}] storage`, storage);
}

function logNavigation(label: string, eventName: string, url: string, isMainFrame?: boolean): void {
  console.info(`[login:${label}] ${eventName}`, {
    url: summarizeUrl(url),
    isMainFrame
  });
}

export function attachLoginDiagnostics(
  label: string,
  window: BrowserWindow,
  webContents: WebContents
): void {
  if (!isEnabled() || attachedWebContents.has(webContents)) {
    return;
  }

  attachedWebContents.add(webContents);

  webContents.once("dom-ready", () => {
    if (!webContents.isDevToolsOpened()) {
      webContents.openDevTools({ mode: "detach" });
    }
  });

  webContents.on("will-navigate", (event) => {
    logNavigation(label, "will-navigate", event.url, event.isMainFrame);
  });

  webContents.on("did-start-navigation", (event) => {
    logNavigation(label, "did-start-navigation", event.url, event.isMainFrame);
  });

  webContents.on("will-redirect", (event) => {
    logNavigation(label, "will-redirect", event.url, event.isMainFrame);
  });

  webContents.on("did-redirect-navigation", (event) => {
    logNavigation(label, "did-redirect-navigation", event.url, event.isMainFrame);
  });

  webContents.on("did-navigate", (_event, url, httpResponseCode, httpStatusText) => {
    console.info(`[login:${label}] did-navigate`, {
      url: summarizeUrl(url),
      httpResponseCode,
      httpStatusText
    });
  });

  webContents.on("did-navigate-in-page", (_event, url, isMainFrame) => {
    logNavigation(label, "did-navigate-in-page", url, isMainFrame);
  });

  webContents.on("did-frame-finish-load", (_event, isMainFrame, frameProcessId, frameRoutingId) => {
    console.info(`[login:${label}] did-frame-finish-load`, {
      url: summarizeUrl(webContents.getURL()),
      isMainFrame,
      frameProcessId,
      frameRoutingId
    });
  });

  webContents.on("did-finish-load", () => {
    console.info(`[login:${label}] did-finish-load`, {
      url: summarizeUrl(webContents.getURL()),
      title: webContents.getTitle()
    });

    dumpCookies(label, webContents).catch((error) => {
      console.warn(`[login:${label}] cookie dump failed`, error);
    });
    dumpStorage(label, webContents).catch((error) => {
      console.warn(`[login:${label}] storage dump failed`, error);
    });
  });

  webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.warn(`[login:${label}] did-fail-load`, {
      errorCode,
      errorDescription,
      url: summarizeUrl(validatedURL),
      isMainFrame
    });
  });

  window.on("closed", () => {
    console.info(`[login:${label}] window closed`);
  });
}
