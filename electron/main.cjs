const path = require('node:path');
const { app, ipcMain, Tray } = require('electron');
const { loadSettings } = require('./settings.cjs');
const { createPetState } = require('./pet-state.cjs');
const { createWindowManager } = require('./windows.cjs');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    app.setAppUserModelId('io.github.getfers.stone');
    const tray = new Tray(path.join(__dirname, '..', 'assets', 'tray.png'));
    const settings = loadSettings(app.getPath('userData'));
    const pet = createPetState(app.getPath('userData'));
    const windows = createWindowManager(
      settings,
      () => app.quit(),
      () => {
        if (!tray.isDestroyed()) tray.setContextMenu(windows.menu());
      },
      () => pet.snapshot()
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
    ipcMain.on('stone:overlay-panel', (event, open) => {
      const entry = windows.fromSender(event.sender);
      if (!entry?.overlay || typeof open !== 'boolean') return;
      entry.window.setFocusable(open);
      if (open) entry.window.focus();
    });
    ipcMain.on('stone:activity', (event, busy) => {
      const entry = windows.fromSender(event.sender);
      if (!entry || entry.mode === 'welcome' || typeof busy !== 'boolean') return;
      entry.busy = busy;
      if (busy) windows.publishPet(pet.command('activity'));
    });
    ipcMain.on('stone:pet-command', (event, action, value) => {
      const entry = windows.fromSender(event.sender);
      if (!entry || typeof action !== 'string' || (entry.mode === 'welcome' && action !== 'stroke')) return;
      windows.publishPet(pet.command(action, value));
    });
    const tick = setInterval(() => {
      windows.publishPet(pet.tick({
        busy: windows.current?.busy,
        roaming: settings.roaming,
        active: Boolean(windows.current && windows.current.mode !== 'welcome')
      }));
    }, 1000);

    tray.setToolTip('Камешек');
    tray.setContextMenu(windows.menu());
    tray.on('click', () => windows.show('welcome'));
    app.on('before-quit', () => {
      clearInterval(tick);
      pet.save();
      tray.destroy();
    });
    app.on('second-instance', () => windows.show('welcome'));
    app.on('activate', () => windows.show('welcome'));

    windows.show('welcome');
  });

  // Closing a window leaves the tray available for choosing another mode.
  app.on('window-all-closed', () => {});
}
