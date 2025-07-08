const { contextBridge, ipcRenderer } = require('electron');

const api = {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  getBackendPort: () => ipcRenderer.invoke('backend-port'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
};

contextBridge.exposeInMainWorld('electronAPI', api);

function waitForApi(callback, maxAttempts = 20, interval = 300) {
  let attempts = 0;
  const check = () => {
    if (window.electronAPI) {
      callback();
    } else if (attempts < maxAttempts) {
      attempts++;
      setTimeout(check, interval);
    }
  };
  check();
}

function setupEventListeners() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('a');
    if (target?.href && (target.target === '_blank' || target.href.startsWith('http'))) {
      event.preventDefault();
      window.electronAPI.openExternal(target.href);
    }
  });
}

waitForApi(setupEventListeners);
