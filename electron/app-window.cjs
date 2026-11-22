const path = require('node:path');
const { BrowserWindow } = require('electron');

const root = path.join(__dirname, '..');

function createAppWindow(options) {
  const { webPreferences, ...windowOptions } = options;
  const window = new BrowserWindow({
    title: 'Камешек',
    icon: path.join(root, 'assets', 'stone.png'),
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#141414',
    ...windowOptions,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      ...webPreferences
    }
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  return window;
}

module.exports = { createAppWindow, root };
