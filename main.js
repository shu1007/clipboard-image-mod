const { app, BrowserWindow, clipboard, ipcMain, nativeImage } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-clipboard-image', () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) {
    return null;
  }
  return image.toDataURL();
});

ipcMain.handle('set-clipboard-image', (event, dataURL) => {
  const image = nativeImage.createFromDataURL(dataURL);
  clipboard.writeImage(image);
  return true;
});