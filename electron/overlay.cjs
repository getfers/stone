const { screen } = require('electron');

function watchOverlay(window) {
  let hitArea = null;
  let held = false;
  let ignoring = true;
  let timer;

  function updateMouseInput() {
    if (window.isDestroyed()) return;
    let overPet = false;
    if (!held && hitArea?.length) {
      const cursor = screen.getCursorScreenPoint();
      const bounds = window.getContentBounds();
      const localX = cursor.x - bounds.x;
      const localY = cursor.y - bounds.y;
      overPet = hitArea.some(({ x, y, width, height }) =>
        localX >= x && localX < x + width && localY >= y && localY < y + height
      );
    }
    const shouldIgnore = !held && !overPet;
    if (shouldIgnore !== ignoring) {
      window.setIgnoreMouseEvents(shouldIgnore);
      ignoring = shouldIgnore;
    }
  }

  // The system cursor is available even while the entire window ignores mouse input.
  window.setIgnoreMouseEvents(true);
  window.once('closed', () => clearInterval(timer));
  function setVisible(visible) {
    clearInterval(timer);
    if (visible) {
      timer = setInterval(updateMouseInput, 32);
      return;
    }
    hitArea = null;
    held = false;
    updateMouseInput();
  }
  window.webContents.on('render-process-gone', () => setVisible(false));

  return {
    setVisible,
    setHitArea(area) {
      if (!Array.isArray(area) || area.length > 16 || !area.every(rect =>
        rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
        rect.width > 0 && rect.height > 0
      )) return;

      hitArea = area;
      updateMouseInput();
    },
    setPointerHeld(value) {
      if (typeof value !== 'boolean') return;
      held = value;
      updateMouseInput();
    }
  };
}

module.exports = { watchOverlay };
