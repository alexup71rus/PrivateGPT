const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  onBackendPort: (callback) => {
    ipcRenderer.on('backend-port', (event, port) => {
      console.log(`Received backend-port: ${port}`);
      callback(port);
    });
  }
});
