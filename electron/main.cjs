const path = require('node:path');
const { translate } = require('../renderer/i18n.mjs');
const { app, BrowserWindow, ipcMain, nativeTheme, powerMonitor, Tray } = require('electron');
const { loadSettings, validatePreference } = require('./settings.cjs');
const { createPetState } = require('./pet-state.cjs');
const { createWindowManager } = require('./windows.cjs');
const { createOrganizer } = require('./organizer.cjs');
const { createOrganizerWindows } = require('./organizer-windows.cjs');
const { createAppWindow, root } = require('./app-window.cjs');

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
  const t = text => translate(settings.language, text);
  const pet = createPetState(userData);
  const organizer = createOrganizer(userData);
  const win = process.platform === 'win32';
  const tray = new Tray(path.join(__dirname, '..', 'assets', win ? 'tray.ico' : 'tray.png'));
  const canAutostart = win && app.isPackaged;
  // The installed process of a portable build runs under a temporary directory.
  const login = { path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: ['--autostart'] };
  let quitting = false;
  let settingsWindow;

  const extra = createOrganizerWindows(() => windows.publishPet(pet.command('alert')), settings);
  const windows = createWindowManager(settings, {
    quit: () => app.quit(),
    refreshMenu,
    petSnapshot: () => pet.snapshot(),
    openOrganizer: extra.open,
    openSettings,
    setAutostart,
    canAutostart,
    canHide: () => !quitting && !tray.isDestroyed()
  });

  function refreshMenu() {
    if (tray.isDestroyed()) return;
    tray.setToolTip(t('Камешек'));
    tray.setContextMenu(windows.menu());
  }

  function publishPreferences() {
    const publicSettings = settings.presentation();
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('stone:preferences-changed', publicSettings);
    }
    return publicSettings;
  }

  function openSettings() {
    if (settingsWindow) {
      if (settingsWindow.isMinimized()) settingsWindow.restore();
      settingsWindow.show();
      return;
    }
    const window = createAppWindow({
      title: t('Камешек · Настройки'), width: 626, height: 620,
      minWidth: 480, minHeight: 470
    });
    settingsWindow = window;
    window.once('closed', () => { settingsWindow = null; });
    window.once('ready-to-show', () => window.show());
    window.loadFile(path.join(root, 'settings.html'), { query: { language: settings.language } }).catch(error => {
      console.warn('Could not open settings:', error.message);
      if (!window.isDestroyed()) window.destroy();
    });
  }

  function setAutostart(enabled) {
    if (!canAutostart) return;
    const previous = settings.autostart;
    app.setLoginItemSettings({ ...login, openAtLogin: enabled, enabled });
    try {
      const status = app.getLoginItemSettings(login);
      if (status.openAtLogin !== enabled || status.executableWillLaunchAtLogin !== enabled) {
        throw new Error('Windows rejected the change');
      }
      settings.update({ autostart: enabled });
    } catch (error) {
      app.setLoginItemSettings({ ...login, openAtLogin: previous, enabled: previous });
      throw error;
    }
    refreshMenu();
    publishPreferences();
  }

  function checkSchedule() {
    try {
      if (organizer.collect()) extra.publish(organizer.snapshot());
    } catch (error) {
      console.warn('Could not update schedule:', error.message);
    }
    const alert = organizer.current();
    extra.showAlert(alert && { ...alert, defaultLabel: organizer.hasDefaultLabel(alert), equipped: pet.snapshot().equipped, volume: settings.volume });
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
    const entry = windows.fromSender(event.sender);
    if (entry?.visible) entry.overlay?.setHitArea(area);
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
  ipcMain.on('stone:open-settings', event => {
    if (windows.fromSender(event.sender)) openSettings();
  });
  ipcMain.handle('stone:preferences', event => {
    if (settingsWindow?.webContents !== event.sender && !windows.fromSender(event.sender) &&
        !extra.isEditor(event.sender) && !extra.isAlert(event.sender)) {
      throw new Error('Invalid preferences window');
    }
    return { ...settings.presentation(), canAutostart };
  });
  ipcMain.handle('stone:update-preference', (event, key, value) => {
    const welcomeLanguage = key === 'language' && windows.fromSender(event.sender)?.mode === 'welcome';
    if (settingsWindow?.webContents !== event.sender && !welcomeLanguage) {
      throw new Error('Invalid settings window');
    }
    validatePreference(key, value);
    if (key === 'autostart') {
      if (!canAutostart) throw new Error('Windows startup is unavailable');
      setAutostart(value);
      return settings.presentation();
    }
    settings.update({ [key]: value });
    if (key === 'language') refreshMenu();
    return publishPreferences();
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
    const active = Boolean(entry?.visible && entry.mode !== 'welcome');
    windows.publishPet(pet.tick({
      busy: (active && entry.busy) || organizer.current()?.kind === 'alarm',
      roaming: settings.roaming,
      active
    }));
  }, 1000);
  powerMonitor.on('resume', checkSchedule);
  checkSchedule();

  const restore = () => windows.show(settings.mode);
  refreshMenu();
  tray.on('click', restore);
  app.on('second-instance', (_event, argv) => { if (!argv.includes('--autostart')) restore(); });
  app.on('activate', restore);
  app.on('before-quit', () => {
    quitting = true;
    clearInterval(tick);
    powerMonitor.off('resume', checkSchedule);
    pet.save();
    settingsWindow?.destroy();
    extra.close();
    tray.destroy();
  });

  const startMode = settings.startupWindow(process.argv.includes('--autostart'));
  if (startMode) windows.show(startMode);
}
