import { app } from "electron";
import path from "node:path";

export const APP_ID = "com.zalo.desktop";
export const DESKTOP_FILE_NAME = `${APP_ID}.desktop`;
export const PRODUCT_NAME = "Zalo Desktop";
export const ZALO_URL = "https://chat.zalo.me/";
export const ZALO_PARTITION = "persist:zalo";
export const ZALO_ACCEPT_LANGUAGES = "vi-VN,vi,en-US,en";

const ADDITIONAL_TRUSTED_ZALO_HOSTS = new Set(["oauth.zaloapp.com"]);

export function isTrustedZaloHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();

  return (
    normalizedHost === "zalo.me" ||
    normalizedHost.endsWith(".zalo.me") ||
    normalizedHost === "zaloapp.com" ||
    normalizedHost.endsWith(".zaloapp.com")
  );
}

export function isTrustedZaloUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isTrustedZaloHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function getChromeLinuxUserAgent(): string {
  const chromeVersion = process.versions.chrome || "120.0.0.0";
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

export function isDevelopment(): boolean {
  return !app.isPackaged;
}

export function getRendererPath(fileName: string): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app.asar", "src", "renderer", fileName)
    : path.join(app.getAppPath(), "src", "renderer", fileName);
}

export function getAssetPath(...segments: string[]): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets", ...segments)
    : path.join(app.getAppPath(), "assets", ...segments);
}

export function getIconPath(size = 256): string {
  return getAssetPath("icons", `${size}x${size}.png`);
}
