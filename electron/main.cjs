const path = require('node:path');
const { app, ipcMain, nativeTheme, powerMonitor, Tray } = require('electron');
const { loadSettings } = require('./settings.cjs');
const { createPetState } = require('./pet-state.cjs');
const { createWindowManager } = require('./windows.cjs');
const { createOrganizer } = require('./organizer.cjs');
const { createOrganizerWindows } = require('./organizer-windows.cjs');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(start);
  app.on('window-all-closed', () => {});
}

function start() {
  nativeTheme.themeSource = 'dark';
  app.setAppUserModelId('io.github.getfers.stone');
  const userData = app.getPath('userData');
  const settings = loadSettings(userData);
  const pet = createPetState(userData);
  const organizer = createOrganizer(userData);
  const win = process.platform === 'win32';
  const tray = new Tray(path.join(__dirname, '..', 'assets', win ? 'tray.ico' : 'tray.png'));
  const canAutostart = win && app.isPackaged;
  // The installed process of a portable build runs under a temporary directory.
  const login = { path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: ['--autostart'] };
  let quitting = false;

  const extra = createOrganizerWindows(() => windows.publishPet(pet.command('alert')));
  const windows = createWindowManager(settings, {
    quit: () => app.quit(),
    refreshMenu,
    petSnapshot: () => pet.snapshot(),
    openOrganizer: extra.open,
    setAutostart,
    canAutostart,
    canHide: () => !quitting && !tray.isDestroyed()
  });

  function refreshMenu() {
    if (!tray.isDestroyed()) tray.setContextMenu(windows.menu());
  }

  function setAutostart(enabled) {
    if (!canAutostart) return;
    const previous = settings.autostart;
    app.setLoginItemSettings({ ...login, openAtLogin: enabled, enabled });
    try {
      const status = app.getLoginItemSettings(login);
      if (status.openAtLogin !== enabled || status.executableWillLaunchAtLogin !== enabled) {
        throw new Error('Windows не приняла изменение');
      }
      settings.update({ autostart: enabled });
    } catch (error) {
      app.setLoginItemSettings({ ...login, openAtLogin: previous, enabled: previous });
      throw error;
    }
    refreshMenu();
  }

  function checkSchedule() {
    try {
      if (organizer.collect()) extra.publish(organizer.snapshot());
    } catch (error) {
      console.warn('Could not update schedule:', error.message);
    }
    const alert = organizer.current();
    extra.showAlert(alert && { ...alert, equipped: pet.snapshot().equipped });
  }

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
    if (!entry || action === 'alert' || typeof action !== 'string' ||
        (entry.mode === 'welcome' && action !== 'stroke')) return;
    windows.publishPet(pet.command(action, value));
  });

  ipcMain.on('stone:open-organizer', (event, tab) => {
    if (windows.fromSender(event.sender) && ['notes', 'alarms'].includes(tab)) extra.open(tab);
  });
  ipcMain.handle('stone:organizer', event => {
    if (!extra.isEditor(event.sender)) throw new Error('Invalid organizer window');
    return { state: organizer.snapshot(), tab: extra.tab };
  });
  ipcMain.handle('stone:organizer-update', (event, kind, action, data) => {
    if (!extra.isEditor(event.sender)) throw new Error('Invalid organizer window');
    organizer.update(kind, action, data);
    extra.publish(organizer.snapshot());
    checkSchedule();
    return organizer.snapshot();
  });
  ipcMain.handle('stone:alert-data', event => {
    if (!extra.isAlert(event.sender)) throw new Error('Invalid alert window');
    return extra.alert;
  });
  ipcMain.handle('stone:alert-action', (event, id, action) => {
    if (!extra.isAlert(event.sender)) throw new Error('Invalid alert window');
    if (organizer.respond(id, action)) {
      extra.publish(organizer.snapshot());
      checkSchedule();
    }
  });

  if (canAutostart && settings.autostart) {
    try {
      setAutostart(true);
    } catch (error) {
      console.warn('Could not restore Windows startup:', error.message);
    }
  }

  const tick = setInterval(() => {
    checkSchedule();
    const entry = windows.current;
    const active = Boolean(entry && entry.mode !== 'welcome' && entry.window.isVisible());
    windows.publishPet(pet.tick({
      busy: (active && entry.busy) || organizer.current()?.kind === 'alarm',
      roaming: settings.roaming,
      active
    }));
  }, 1000);
  powerMonitor.on('resume', checkSchedule);
  checkSchedule();

  const restore = () => windows.show(settings.mode);
  tray.setToolTip('Камешек');
  refreshMenu();
  tray.on('click', restore);
  app.on('second-instance', (_event, argv) => { if (!argv.includes('--autostart')) restore(); });
  app.on('activate', restore);
  app.on('before-quit', () => {
    quitting = true;
    clearInterval(tick);
    powerMonitor.off('resume', checkSchedule);
    pet.save();
    extra.close();
    tray.destroy();
  });

  if (!process.argv.includes('--autostart')) restore();
}
