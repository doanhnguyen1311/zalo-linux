import { contextBridge, ipcRenderer } from "electron";

window.addEventListener("online", () => {
  ipcRenderer.send("network:online");
});

window.addEventListener("offline", () => {
  ipcRenderer.send("network:offline");
});

if (window.location.protocol === "file:") {
  contextBridge.exposeInMainWorld("zaloDesktop", {
    reload: () => ipcRenderer.send("app:reload-zalo")
  });
}
