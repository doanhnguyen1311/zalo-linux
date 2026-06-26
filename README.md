# Zalo Desktop

Ubuntu-focused Electron wrapper for the official Zalo Web client at `https://chat.zalo.me`.

This is not an official native Zalo client. It keeps Zalo Web intact and adds Linux desktop behavior around it: packaging, tray behavior, window state, native downloads, notifications, and autostart.

## Project Structure

```txt
package.json
electron-builder.yml
src/
  main/
    index.ts          App lifecycle, single-instance lock, Wayland flags
    window.ts         BrowserWindow, navigation, splash/offline handling
    tray.ts           Linux tray/AppIndicator menu behavior
    menu.ts           Native menu and keyboard shortcuts
    permissions.ts    Origin-scoped permission handling
    downloads.ts      Native save dialog and download progress
    autostart.ts      XDG autostart desktop entry
    badge.ts          Unread parsing and title/tray/badge updates
    store.ts          JSON settings under Electron userData
  preload/
    index.ts          Minimal preload, no Node APIs exposed to Zalo Web
  renderer/
    splash.html
    splash.css
assets/
  icons/
```

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

The app uses Electron's persistent `persist:zalo` session, so login cookies, local storage, and cache survive restarts under the standard Linux Electron user data directory, usually `~/.config/Zalo Desktop`.

## Build

Build both Linux targets:

```bash
npm run build
```

The output goes to `dist/`.

Build artifacts include:

- `.AppImage`
- `.deb`

Install the deb:

```bash
sudo apt install ./dist/*.deb
```

The deb package registers a `.desktop` launcher so Zalo Desktop can be launched from the Ubuntu application menu.

## Ubuntu And GNOME Notes

- Wayland is preferred on Wayland sessions using Chromium's automatic Ozone platform hint.
- To force X11 fallback, start the app with:

  ```bash
  ZALO_DESKTOP_FORCE_X11=1 npm run dev
  ```

- GNOME may hide tray icons unless AppIndicator support is installed. On Ubuntu this is normally available through the built-in AppIndicator/KStatusNotifier integration, but some GNOME setups require an extension.
- Linux launcher badges are inconsistent across GNOME, AppImage, and deb installs. The app updates the window title and tray tooltip with unread state, and calls Electron's badge API where supported.

## Notifications

Zalo Web can request Web Notification permission. This wrapper grants supported permissions only to trusted HTTPS Zalo URLs such as `https://chat.zalo.me/`, `https://zalo.me/`, and `https://*.zalo.me/`, then denies unknown origins. Notifications depend on Zalo Web's own browser notification behavior and Ubuntu/GNOME notification settings.

Click handling for notifications is controlled mostly by Chromium and Zalo Web. The app focuses itself for its own download notifications.

## Tray

Closing the window hides it to the tray instead of quitting. Use the tray menu to:

- Open Zalo
- Reload
- Toggle launch at login
- Quit

Left-clicking the tray icon toggles the main window.

## Auto Start

The launch-at-login option is available from the native menu and tray menu. On Linux it writes an XDG autostart file to:

```txt
~/.config/autostart/com.zalo.desktop.desktop
```

Electron's `setLoginItemSettings` is also called as a best-effort helper, but the XDG autostart file is the reliable Ubuntu path.

## Downloads And File Uploads

Downloads use a native Linux save dialog and preserve Zalo's suggested filename. The window progress indicator is updated while a file downloads, and a desktop notification is shown when a download completes or fails.

File upload, drag and drop, clipboard paste, image upload, and PDF upload are left to Chromium/Zalo Web's normal behavior. The wrapper does not inject code into the page or disable web security.

## Login Diagnostics

In development, the app opens DevTools and prints Zalo login navigation, redirect, cookie, and storage summaries. In packaged builds, enable the same diagnostics with:

```bash
ZALO_DESKTOP_DEBUG_LOGIN=1 ./dist/Zalo\ Desktop-1.0.0-x86_64.AppImage
```

Cookie values are not printed; the diagnostics log cookie names and metadata only.

## Permissions

Permissions are granted only for trusted HTTPS Zalo URLs, including `https://chat.zalo.me/`, `https://zalo.me/`, `https://*.zalo.me/`, and `https://oauth.zaloapp.com/`.

Supported permissions:

- Notifications
- Clipboard read
- Camera and microphone, with an explicit native prompt
- Display capture, where supported by Electron/Chromium

Unknown origins are denied.

## Keyboard Shortcuts

- `Ctrl+R`: reload
- `Ctrl+Shift+R`: force reload
- `F5`: reload
- `Ctrl+L`: disabled
- `Ctrl+Q`: quit
- `Ctrl+W`: hide to tray
- `Ctrl++`: zoom in
- `Ctrl+-`: zoom out
- `Ctrl+0`: reset zoom

## Replacing The Icon

Replace files in `assets/icons/`. Keep the PNG names such as `256x256.png` and `512x512.png`, because they are used by Electron, the tray, AppImage, deb packaging, and the desktop entry.

The editable source is `assets/icons/source.svg`.

## Known Limitations

- This is a wrapper around Zalo Web, so login behavior, message features, calling, uploads, and notifications still depend on Zalo Web.
- Unread count detection is best-effort and based on the page title. If Zalo changes its title format, the tray tooltip/window title may not show a count.
- GNOME tray visibility depends on AppIndicator/KStatusNotifier support.
- Linux launcher badges are not consistently supported by GNOME.
- Wayland screen sharing and file portal behavior can vary by Electron, Chromium, Ubuntu release, and desktop portal configuration.
- Some external Zalo login or account pages may open in-app, while unrelated links open in the system browser.
