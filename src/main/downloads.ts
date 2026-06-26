import { BrowserWindow, Notification, Session, dialog } from "electron";

function showDownloadNotification(title: string, body: string, onClick?: () => void): void {
  if (!Notification.isSupported()) {
    return;
  }

  const notification = new Notification({ title, body });
  if (onClick) {
    notification.on("click", onClick);
  }
  notification.show();
}

export function configureDownloads(session: Session, mainWindow: BrowserWindow): void {
  session.on("will-download", (event, item) => {
    const filename = item.getFilename();
    const targetPath = dialog.showSaveDialogSync(mainWindow, {
      title: "Save Zalo Download",
      defaultPath: filename,
      buttonLabel: "Save"
    });

    if (!targetPath) {
      event.preventDefault();
      return;
    }

    item.setSavePath(targetPath);
    mainWindow.setProgressBar(0);

    item.on("updated", (_event, state) => {
      if (state === "interrupted") {
        mainWindow.setProgressBar(-1);
        return;
      }

      const totalBytes = item.getTotalBytes();
      if (totalBytes > 0) {
        mainWindow.setProgressBar(item.getReceivedBytes() / totalBytes);
      }
    });

    item.once("done", (_event, state) => {
      mainWindow.setProgressBar(-1);

      if (state === "completed") {
        showDownloadNotification("Download complete", filename, () => {
          mainWindow.show();
          mainWindow.focus();
        });
        return;
      }

      if (state === "cancelled") {
        return;
      }

      showDownloadNotification("Download failed", filename);
    });
  });
}
