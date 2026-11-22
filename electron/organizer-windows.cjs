const path = require('node:path');
const { screen } = require('electron');
const { createAppWindow, root } = require('./app-window.cjs');

function createOrganizerWindows(onAlertShown) {
  let editor;
  let alertWindow;
  let alert;
  let tab = 'notes';

  function open(section) {
    tab = section;
    if (editor) {
      if (editor.isMinimized()) editor.restore();
      editor.show();
      editor.webContents.send('stone:organizer-tab', tab);
      return;
    }
    const window = createAppWindow({
      title: 'Камешек · Органайзер', width: 880, height: 610,
      minWidth: 570, minHeight: 490
    });
    editor = window;
    window.once('closed', () => { editor = null; });
    window.once('ready-to-show', () => window.show());
    load(window, 'organizer.html');
  }

  function load(window, page) {
    window.loadFile(path.join(root, page)).catch(error => {
      console.warn('Could not load %s: %s', page, error.message);
      if (!window.isDestroyed()) window.destroy();
    });
  }

  function placeAlert(window) {
    const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const [width, height] = window.getSize();
    window.setPosition(
      Math.max(workArea.x, workArea.x + workArea.width - width - 18),
      Math.max(workArea.y, workArea.y + workArea.height - height - 18)
    );
  }

  function reveal(window) {
    if (!alert || window !== alertWindow) return;
    placeAlert(window);
    if (alert.kind === 'alarm') {
      window.show();
      window.moveTop();
    } else {
      window.showInactive();
      window.moveTop();
    }
  }

  function showAlert(next) {
    if (!next) {
      alert = null;
      alertWindow?.destroy();
      return;
    }
    const isNew = alert?.id !== next.id;
    if (!isNew && alert.text === next.text && alert.sound === next.sound && alertWindow) return;
    if (isNew) onAlertShown();
    alert = next;
    if (alertWindow) {
      alertWindow.webContents.send('stone:alert', alert);
      if (isNew && alertWindow.isVisible()) reveal(alertWindow);
      return;
    }
    const window = createAppWindow({
      title: 'Камешек · Напоминание', width: 416, height: 316, frame: false,
      alwaysOnTop: true, skipTaskbar: true, resizable: false, minimizable: false,
      maximizable: false, fullscreenable: false, hasShadow: false, backgroundColor: '#00000000',
      transparent: true, webPreferences: { autoplayPolicy: 'no-user-gesture-required' }
    });
    alertWindow = window;
    window.setAlwaysOnTop(true, 'screen-saver');
    window.on('close', event => { if (alert) event.preventDefault(); });
    window.once('closed', () => { alertWindow = null; });
    window.webContents.on('render-process-gone', () => window.destroy());
    window.webContents.on('did-finish-load', () => {
      window.webContents.send('stone:alert', alert);
    });
    window.once('ready-to-show', () => reveal(window));
    load(window, 'alert.html');
  }

  return {
    open, showAlert,
    get tab() { return tab; },
    get alert() { return alert; },
    isEditor: sender => editor?.webContents === sender,
    isAlert: sender => alertWindow?.webContents === sender,
    publish(state) { editor?.webContents.send('stone:organizer-state', state); },
    close() {
      showAlert(null);
      editor?.destroy();
    }
  };
}

module.exports = { createOrganizerWindows };
