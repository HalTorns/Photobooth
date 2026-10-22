const { contextBridge, ipcRenderer } = require("electron");
const allowed = new Set([
  "boot",
  "unlock",
  "setPin",
  "lock",
  "kiosk",
  "chooseStorage",
  "saveEvent",
  "createEvent",
  "selectEvent",
  "exportEvent",
  "importEvent",
  "importAsset",
  "cameras",
  "connectCamera",
  "cameraPreview",
  "startSession",
  "nativeCapture",
  "saveFrame",
  "appendAudio",
  "finishSession",
  "abortSession",
  "recent",
  "thumbnail",
  "resultPreview",
  "openStorage",
  "diagnostics",
]);
contextBridge.exposeInMainWorld("photobooth", {
  invoke: async (operation, input) => {
    if (!allowed.has(operation)) throw new Error("Opération inconnue.");
    const result = await ipcRenderer.invoke("photobooth", operation, input);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  },
  onCloseBlocked: (callback) => {
    const listener = (_e, message) => callback(message);
    ipcRenderer.on("close-blocked", listener);
    return () => ipcRenderer.removeListener("close-blocked", listener);
  },
});
