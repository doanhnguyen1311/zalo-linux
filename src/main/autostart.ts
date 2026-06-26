import { app } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DESKTOP_FILE_NAME, PRODUCT_NAME, getIconPath, isDevelopment } from "./config";
import { Store } from "./store";

function quoteExecPart(value: string): string {
  return `"${value.replace(/(["\\$`])/g, "\\$1")}"`;
}

function getAutostartDir(): string {
  return path.join(os.homedir(), ".config", "autostart");
}

function getDesktopEntryPath(): string {
  return path.join(getAutostartDir(), DESKTOP_FILE_NAME);
}

function getExecCommand(): string {
  if (isDevelopment()) {
    return `${quoteExecPart(process.execPath)} ${quoteExecPart(app.getAppPath())}`;
  }

  return quoteExecPart(process.execPath);
}

function buildDesktopEntry(): string {
  return [
    "[Desktop Entry]",
    "Type=Application",
    `Name=${PRODUCT_NAME}`,
    "Comment=Start Zalo Desktop at login",
    `Exec=${getExecCommand()}`,
    `Icon=${getIconPath(256)}`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    "Categories=Network;InstantMessaging;",
    ""
  ].join("\n");
}

export class AutoStart {
  constructor(private readonly store: Store) {}

  isEnabled(): boolean {
    return this.store.get("autoStart");
  }

  applySavedSetting(): void {
    this.setEnabled(this.isEnabled());
  }

  toggle(): boolean {
    const next = !this.isEnabled();
    this.setEnabled(next);
    return next;
  }

  setEnabled(enabled: boolean): void {
    this.store.set("autoStart", enabled);

    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath
      });
    } catch {
      // Linux desktop environments vary; the XDG autostart file below is the durable path.
    }

    const desktopEntryPath = getDesktopEntryPath();
    if (enabled) {
      fs.mkdirSync(path.dirname(desktopEntryPath), { recursive: true });
      fs.writeFileSync(desktopEntryPath, buildDesktopEntry(), {
        encoding: "utf8",
        mode: 0o644
      });
      return;
    }

    try {
      fs.rmSync(desktopEntryPath, { force: true });
    } catch {
      // Best effort: failing to remove autostart should not prevent normal app use.
    }
  }
}
