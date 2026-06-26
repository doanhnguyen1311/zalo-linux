import { BrowserWindow, Menu, Tray, app } from "electron";
import { AutoStart } from "./autostart";
import { PRODUCT_NAME, getIconPath } from "./config";

export interface TrayActions {
  reload: () => void;
  toggleAutoStart: () => boolean;
  quit: () => void;
}

function showWindow(window: BrowserWindow): void {
  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
}

export function createTray(
  mainWindow: BrowserWindow,
  autoStart: AutoStart,
  actions: TrayActions
): Tray {
  const tray = new Tray(getIconPath(32));

  const updateMenu = (): void => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open Zalo",
        click: () => showWindow(mainWindow)
      },
      {
        label: "Reload",
        click: actions.reload
      },
      {
        type: "checkbox",
        label: "Launch at Login",
        checked: autoStart.isEnabled(),
        click: () => {
          actions.toggleAutoStart();
          updateMenu();
        }
      },
      { type: "separator" },
      {
        label: "Quit",
        accelerator: "Ctrl+Q",
        click: actions.quit
      }
    ]);

    tray.setContextMenu(contextMenu);
  };

  tray.setToolTip(PRODUCT_NAME);
  tray.on("click", () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
      return;
    }

    showWindow(mainWindow);
  });

  tray.on("right-click", () => {
    updateMenu();
    tray.popUpContextMenu();
  });

  app.on("before-quit", () => {
    tray.destroy();
  });

  updateMenu();
  return tray;
}
