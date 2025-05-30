import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let backendProcess;
let tryesIfFailLoad = 10;
const backendPort = 3001;

function startBackend() {
  const backendEntry = path.join(__dirname, '../backend/dist/main.js');
  console.log('Spawning backend:', backendEntry);

  backendProcess = spawn('node', [backendEntry], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(backendPort),
      CORS_ORIGIN: 'http://localhost:3000',
    },
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log('Backend exited with code:', code);
  });
}

function createWindow() {
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

  mainWindow = new BrowserWindow({
    width: 1200,
    height: isDev ? 1200 : 800,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  console.log('Is Development:', isDev);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  ipcMain.handle('window:minimize', () => mainWindow.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow.close());
  ipcMain.handle('backend-port', () => {
    return backendPort;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', () => {
    if (tryesIfFailLoad <= 0) return;
    tryesIfFailLoad--;
    setTimeout(() => mainWindow.reload(), 500);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    tryesIfFailLoad = 10;
    mainWindow.webContents.send('backend-port', backendPort);
  });
}

app.whenReady().then(() => {
  createWindow();
  startBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
