const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronOpenExternal', (url) => {
  return ipcRenderer.invoke('open-external', url);
});
