import { BrowserWindow, Menu, app, dialog } from "electron";
import { AutoStart } from "./autostart";
import { PRODUCT_NAME, ZALO_URL, isDevelopment } from "./config";
import { Store } from "./store";

export interface MenuActions {
  reload: () => void;
  forceReload: () => void;
  quit: () => void;
}

function applyZoom(mainWindow: BrowserWindow, store: Store, zoomFactor: number): void {
  const clamped = Math.min(2, Math.max(0.5, Number(zoomFactor.toFixed(2))));
  mainWindow.webContents.setZoomFactor(clamped);
  store.set("zoomFactor", clamped);
}

export function configureKeyboardShortcuts(
  mainWindow: BrowserWindow,
  store: Store,
  actions: MenuActions
): void {
  mainWindow.webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase();

    if (input.control && key === "l") {
      event.preventDefault();
      return;
    }

    if (input.control && key === "w") {
      event.preventDefault();
      mainWindow.hide();
      return;
    }

    if (input.control && key === "q") {
      event.preventDefault();
      actions.quit();
      return;
    }

    if (input.control && input.shift && key === "r") {
      event.preventDefault();
      actions.forceReload();
      return;
    }

    if ((input.control && key === "r") || input.key === "F5") {
      event.preventDefault();
      actions.reload();
      return;
    }

    if (input.control && (input.key === "+" || input.key === "=")) {
      event.preventDefault();
      applyZoom(mainWindow, store, mainWindow.webContents.getZoomFactor() + 0.1);
      return;
    }

    if (input.control && input.key === "-") {
      event.preventDefault();
      applyZoom(mainWindow, store, mainWindow.webContents.getZoomFactor() - 0.1);
      return;
    }

    if (input.control && input.key === "0") {
      event.preventDefault();
      applyZoom(mainWindow, store, 1);
    }
  });
}

export function createApplicationMenu(
  mainWindow: BrowserWindow,
  store: Store,
  autoStart: AutoStart,
  actions: MenuActions
): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: PRODUCT_NAME,
      submenu: [
        {
          label: "Open Zalo",
          click: () => {
            mainWindow.show();
            mainWindow.focus();
          }
        },
        { type: "separator" },
        {
          label: "Reload",
          accelerator: "Ctrl+R",
          click: actions.reload
        },
        {
          label: "Force Reload",
          accelerator: "Ctrl+Shift+R",
          click: actions.forceReload
        },
        { type: "separator" },
        {
          label: "Zoom In",
          accelerator: "Ctrl+=",
          click: () => applyZoom(mainWindow, store, mainWindow.webContents.getZoomFactor() + 0.1)
        },
        {
          label: "Zoom Out",
          accelerator: "Ctrl+-",
          click: () => applyZoom(mainWindow, store, mainWindow.webContents.getZoomFactor() - 0.1)
        },
        {
          label: "Reset Zoom",
          accelerator: "Ctrl+0",
          click: () => applyZoom(mainWindow, store, 1)
        },
        { type: "separator" },
        {
          type: "checkbox",
          label: "Launch at Login",
          checked: autoStart.isEnabled(),
          click: (menuItem) => {
            const enabled = autoStart.toggle();
            menuItem.checked = enabled;
          }
        },
        ...(isDevelopment()
          ? [
              { type: "separator" as const },
              {
                label: "Toggle DevTools",
                accelerator: "Ctrl+Shift+I",
                click: () => mainWindow.webContents.toggleDevTools()
              }
            ]
          : []),
        { type: "separator" },
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: `About ${PRODUCT_NAME}`,
              message: PRODUCT_NAME,
              detail: `Unofficial Ubuntu desktop wrapper for ${ZALO_URL}.\n\nApp data: ${app.getPath("userData")}`
            });
          }
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: "Ctrl+Q",
          click: actions.quit
        }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [{ role: "togglefullscreen" }]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
