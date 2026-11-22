const path = require('node:path');
const { app, ipcMain, Tray } = require('electron');
const { loadSettings } = require('./settings.cjs');
const { createWindowManager } = require('./windows.cjs');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    app.setAppUserModelId('io.github.getfers.stone');
    const tray = new Tray(path.join(__dirname, '..', 'assets', 'tray.png'));
    const windows = createWindowManager(
      loadSettings(app.getPath('userData')),
      () => app.quit(),
      () => {
        if (!tray.isDestroyed()) tray.setContextMenu(windows.menu());
      }
    );

    ipcMain.on('stone:mode', (event, mode) => {
      if (windows.fromSender(event.sender) && typeof mode === 'string') windows.show(mode);
    });
    ipcMain.on('stone:menu', event => {
      const entry = windows.fromSender(event.sender);
      if (entry) windows.menu().popup({ window: entry.window });
    });
    ipcMain.handle('stone:roaming', (event, value) => {
      if (!windows.fromSender(event.sender) || typeof value !== 'boolean') {
        throw new TypeError('Invalid roaming preference');
      }
      return windows.setRoaming(value);
    });
    ipcMain.on('stone:hit-area', (event, area) => {
      windows.fromSender(event.sender)?.overlay?.setHitArea(area);
    });
    ipcMain.on('stone:pointer-held', (event, held) => {
      windows.fromSender(event.sender)?.overlay?.setPointerHeld(held);
    });

    tray.setToolTip('Камешек');
    tray.setContextMenu(windows.menu());
    tray.on('click', () => windows.show('welcome'));
    app.on('before-quit', () => tray.destroy());
    app.on('second-instance', () => windows.show('welcome'));
    app.on('activate', () => windows.show('welcome'));

    windows.show('welcome');
  });

  // Closing a window leaves the tray available for choosing another mode.
  app.on('window-all-closed', () => {});
}
