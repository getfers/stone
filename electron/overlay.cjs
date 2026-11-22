const { screen } = require('electron');

function watchOverlay(window) {
  let hitArea = null;
  let held = false;
  let ignoring = true;

  function updateMouseInput() {
    if (window.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    const bounds = window.getContentBounds();
    const overPet = hitArea && hitArea.some(({ x, y, width, height }) => {
      const localX = cursor.x - bounds.x;
      const localY = cursor.y - bounds.y;
      return localX >= x && localX < x + width && localY >= y && localY < y + height;
    });
    const shouldIgnore = !held && !overPet;
    if (shouldIgnore !== ignoring) {
      window.setIgnoreMouseEvents(shouldIgnore);
      ignoring = shouldIgnore;
    }
  }

  // The system cursor is available even while the entire window ignores mouse input.
  window.setIgnoreMouseEvents(true);
  const timer = setInterval(updateMouseInput, 16);
  window.once('closed', () => clearInterval(timer));
  window.webContents.on('render-process-gone', () => {
    hitArea = null;
    held = false;
    updateMouseInput();
  });

  return {
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
