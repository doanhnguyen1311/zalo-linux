import { Session } from "electron";
import { isDevelopment, isTrustedZaloUrl } from "./config";

const ALLOWED_PERMISSIONS = new Set([
  "notifications",
  "clipboard-read",
  "media",
  "display-capture",
  "background-sync"
]);

function getOriginFromUrl(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

function isTrustedZaloOrigin(url: string): boolean {
  return isTrustedZaloUrl(url);
}

function logDecision(permission: string, origin: string | undefined, granted: boolean): void {
  if (!isDevelopment()) {
    return;
  }

  const result = granted ? "granted" : "denied";
  console.info(`[permissions] ${result}: ${permission} for ${origin ?? "unknown origin"}`);
}

export function configurePermissions(session: Session): void {
  session.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {
    const granted = isTrustedZaloOrigin(requestingOrigin) && ALLOWED_PERMISSIONS.has(permission);
    logDecision(permission, getOriginFromUrl(requestingOrigin), granted);
    return granted;
  });

  session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestingUrl = details.requestingUrl || webContents.getURL();
    const origin = getOriginFromUrl(requestingUrl);
    const baseAllowed = isTrustedZaloOrigin(requestingUrl) && ALLOWED_PERMISSIONS.has(permission);

    if (!baseAllowed) {
      logDecision(permission, origin, false);
      callback(false);
      return;
    }

    logDecision(permission, origin, true);
    callback(true);
  });
}
