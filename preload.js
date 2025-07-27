const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  setClipboardImage: (dataURL) => ipcRenderer.invoke('set-clipboard-image', dataURL)
});