const path = require('node:path');
const { BrowserWindow, Menu, dialog, screen } = require('electron');
const { watchOverlay } = require('./overlay.cjs');

const root = path.join(__dirname, '..');
const icon = path.join(root, 'assets', 'stone.png');
const titles = {
  welcome: 'Главное меню',
  overlay: 'На рабочем столе',
  widget: 'Мини-виджет',
  full: 'Полное окно'
};

function positionWidget(window, workArea) {
  const [width, height] = window.getSize();
  window.setPosition(workArea.x + workArea.width - width - 16, workArea.y + workArea.height - height - 16);
}

function positionFloatingWindow(entry, display) {
  entry.displayId = display.id;
  if (entry.mode === 'overlay') entry.window.setBounds(display.bounds);
  if (entry.mode === 'widget') positionWidget(entry.window, display.workArea);
}

function createWindowManager(settings, quit, refreshMenu, petSnapshot) {
  let current;
  let pending;

  function show(mode) {
    if (!Object.hasOwn(titles, mode) || pending?.mode === mode) return;

    if (pending) {
      const abandoned = pending;
      pending = null;
      abandoned.window.destroy();
    }
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    if (current?.mode === mode) {
      if (display.id !== current.displayId) positionFloatingWindow(current, display);
      current.window.show();
      if (mode !== 'overlay') current.window.focus();
      return;
    }

    const options = {
      welcome: { width: 1000, height: 672, minWidth: 720, minHeight: 530 },
      full: { width: 1000, height: 740, minWidth: 620, minHeight: 575 },
      widget: {
        width: 354, height: 330, alwaysOnTop: true, resizable: false,
        maximizable: false, fullscreenable: false
      },
      overlay: {
        ...display.bounds, transparent: true, frame: false, roundedCorners: false,
        hasShadow: false, focusable: false, skipTaskbar: true, resizable: false,
        maximizable: false, minimizable: false, fullscreenable: false, alwaysOnTop: true,
        enableLargerThanScreen: true
      }
    };

    const window = new BrowserWindow({
      title: 'Камешек',
      icon,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: mode === 'overlay' ? '#00000000' : '#161421',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        backgroundThrottling: mode !== 'overlay'
      },
      ...options[mode]
    });
    window.removeMenu();
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());

    const entry = { window, mode, displayId: display.id };
    pending = entry;
    if (mode === 'widget') positionWidget(window, display.workArea);
    if (mode === 'overlay') {
      window.setAlwaysOnTop(true, 'screen-saver');
      entry.overlay = watchOverlay(window);
    }
    window.once('closed', () => {
      if (current === entry) {
        current = null;
        refreshMenu();
      }
      if (pending === entry) pending = null;
    });
    function reveal() {
      if (pending !== entry) return;
      const previous = current;
      current = entry;
      pending = null;
      if (mode === 'overlay') window.showInactive();
      else window.show();
      window.webContents.send('stone:roaming-changed', settings.roaming);
      window.webContents.send('stone:pet-state', petSnapshot());
      previous?.window.destroy();
      refreshMenu();
    }
    const ready = new Promise(resolve => window.once('ready-to-show', resolve));
    const loaded = window.loadFile(path.join(root, 'index.html'), {
      query: { mode, roaming: String(settings.roaming) }
    });
    Promise.all([ready, loaded]).then(reveal).catch(error => {
      if (window.isDestroyed()) return;
      window.destroy();
      dialog.showErrorBox('Камешек', 'Не удалось открыть окно. ' + error.message);
    });
  }

  function updateDisplay() {
    for (const entry of [current, pending]) {
      if (!entry || !['overlay', 'widget'].includes(entry.mode)) continue;

      const display = screen.getAllDisplays().find(item => item.id === entry.displayId) ??
        screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      positionFloatingWindow(entry, display);
    }
  }

  for (const event of ['display-added', 'display-removed', 'display-metrics-changed']) {
    screen.on(event, updateDisplay);
  }

  function setRoaming(value) {
    settings.setRoaming(value);
    for (const entry of [current, pending]) {
      entry?.window.webContents.send('stone:roaming-changed', settings.roaming);
    }
    refreshMenu();
    return settings.roaming;
  }

  function menu() {
    return Menu.buildFromTemplate([
      ...Object.entries(titles).map(([mode, label]) => ({
        label,
        type: 'radio',
        checked: current?.mode === mode,
        click: () => show(mode)
      })),
      { label: 'Занятия и уход', enabled: Boolean(current && current.mode !== 'welcome'),
        click: () => current?.window.webContents.send('stone:open-panel') },
      { type: 'separator' },
      { label: 'Самостоятельное движение', type: 'checkbox', checked: settings.roaming, click: item => {
        try {
          setRoaming(item.checked);
        } catch (error) {
          dialog.showErrorBox('Камешек', 'Не удалось сохранить настройку. ' + error.message);
        }
      } },
      { type: 'separator' },
      { label: 'Выйти', click: quit }
    ]);
  }

  return {
    show,
    menu,
    setRoaming,
    get current() {
      return current;
    },
    publishPet(state) {
      current?.window.webContents.send('stone:pet-state', state);
    },
    fromSender(sender) {
      if (current?.window.webContents === sender) return current;
      return undefined;
    }
  };
}

module.exports = { createWindowManager };
