import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

export interface AppSettings {
  autoStart: boolean;
  zoomFactor: number;
  windowState: WindowState;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoStart: false,
  zoomFactor: 1,
  windowState: {
    width: 1280,
    height: 800,
    isMaximized: false
  }
};

export class Store {
  private readonly filePath: string;
  private settings: AppSettings;

  constructor() {
    this.filePath = path.join(app.getPath("userData"), "settings.json");
    this.settings = this.load();
  }

  get all(): AppSettings {
    return this.settings;
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings = { ...this.settings, [key]: value };
    this.save();
  }

  updateWindowState(windowState: Partial<WindowState>): void {
    this.settings = {
      ...this.settings,
      windowState: {
        ...this.settings.windowState,
        ...windowState
      }
    };
    this.save();
  }

  private load(): AppSettings {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<AppSettings>;

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        windowState: {
          ...DEFAULT_SETTINGS.windowState,
          ...parsed.windowState
        }
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), {
      encoding: "utf8",
      mode: 0o600
    });
  }
}
