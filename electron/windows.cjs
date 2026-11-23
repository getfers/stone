const path = require('node:path');
const { translate } = require('../renderer/i18n.mjs');
const { Menu, dialog, screen } = require('electron');
const { watchOverlay } = require('./overlay.cjs');

const { createAppWindow, root } = require('./app-window.cjs');
const titles = {
  welcome: 'Главное меню',
  overlay: 'Оверлей',
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

function createWindowManager(settings, { quit, refreshMenu, petSnapshot, openOrganizer, openSettings, setAutostart, canAutostart, canHide }) {
  const t = text => translate(settings.language, text);
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
      if (current.window.isMinimized()) current.window.restore();
      if (mode === 'overlay') current.window.showInactive();
      else current.window.show();
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

    const window = createAppWindow({
      ...options[mode],
      title: t('Камешек'),
      backgroundColor: mode === 'overlay' ? '#00000000' : '#141414',
      webPreferences: { backgroundThrottling: mode !== 'overlay' }
    });

    const entry = { window, mode, displayId: display.id, visible: false };
    pending = entry;
    if (mode === 'widget') positionWidget(window, display.workArea);
    if (mode === 'overlay') {
      window.setAlwaysOnTop(true, 'pop-up-menu');
      entry.overlay = watchOverlay(window);
    }
    function syncVisibility() {
      if (current !== entry) return;
      const visible = window.isVisible() && !window.isMinimized();
      if (entry.visible === visible) return;
      entry.visible = visible;
      entry.overlay?.setVisible(visible);
      if (visible) window.webContents.send('stone:pet-state', petSnapshot());
      window.webContents.send('stone:pet-visibility', visible);
    }
    for (const event of ['show', 'hide', 'minimize', 'restore']) window.on(event, syncVisibility);
    window.on('close', event => {
      if (current === entry && canHide()) {
        event.preventDefault();
        window.hide();
      }
    });
    window.once('closed', () => {
      if (current === entry) {
        current = null;
        refreshMenu();
      }
      if (pending === entry) pending = null;
    });
    function reveal() {
      if (pending !== entry) return;
      if (mode !== 'welcome') {
        try {
          settings.update({ mode });
        } catch (error) {
          dialog.showErrorBox(t('Камешек'), t('Не удалось сохранить режим окна.') + ' ' + error.message);
        }
      }
      const previous = current;
      current = entry;
      pending = null;
      window.webContents.send('stone:roaming-changed', settings.roaming);
      window.webContents.send('stone:preferences-changed', settings.presentation());
      if (mode === 'overlay') window.showInactive();
      else window.show();
      syncVisibility();
      previous?.window.destroy();
      refreshMenu();
    }
    const ready = new Promise(resolve => window.once('ready-to-show', resolve));
    const loaded = window.loadFile(path.join(root, 'index.html'), {
      query: { mode, roaming: String(settings.roaming), language: settings.language }
    });
    Promise.all([ready, loaded]).then(reveal).catch(error => {
      if (window.isDestroyed()) return;
      window.destroy();
      dialog.showErrorBox(t('Камешек'), t('Не удалось открыть окно.') + ' ' + error.message);
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
    settings.update({ roaming: value });
    for (const entry of [current, pending]) {
      entry?.window.webContents.send('stone:roaming-changed', settings.roaming);
    }
    refreshMenu();
    return settings.roaming;
  }

  function menu() {
    return Menu.buildFromTemplate([
      ...Object.entries(titles).map(([mode, label]) => ({
        label: t(label),
        type: 'radio',
        checked: (current?.mode ?? settings.mode) === mode,
        click: () => show(mode)
      })),
      { label: t('Занятия и уход'), enabled: Boolean(current && current.mode !== 'welcome'),
        click: () => {
          if (!current) return;
          show(current.mode);
          current.window.webContents.send('stone:open-panel');
        } },
      { label: t('Заметки'), click: () => openOrganizer('notes') },
      { label: t('Будильники'), click: () => openOrganizer('alarms') },
      { label: t('Настройки'), click: openSettings },
      { type: 'separator' },
      { label: t('Самостоятельное движение'), type: 'checkbox', checked: settings.roaming, click: item => {
        try {
          setRoaming(item.checked);
        } catch (error) {
          dialog.showErrorBox(t('Камешек'), t('Не удалось сохранить настройку.') + ' ' + error.message);
        }
      } },
      { label: t('Автозапуск с Windows'), type: 'checkbox', enabled: canAutostart, checked: settings.autostart,
        click: item => {
          try {
            setAutostart(item.checked);
          } catch (error) {
            refreshMenu();
            dialog.showErrorBox(t('Камешек'), t('Не удалось изменить автозапуск.') + ' ' + error.message);
          }
        } },
      { type: 'separator' },
      { label: t('Выйти'), click: quit }
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
      if (current?.visible) current.window.webContents.send('stone:pet-state', state);
    },
    fromSender(sender) {
      if (current?.window.webContents === sender) return current;
      return undefined;
    }
  };
}

module.exports = { createWindowManager };
