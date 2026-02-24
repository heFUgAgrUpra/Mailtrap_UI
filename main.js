const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const iconPath = path.join(__dirname, 'assets', 'mailtrap-icon.png');

ipcMain.handle('open-external', (_, url) => {
  if (url && typeof url === 'string') shell.openExternal(url);
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
