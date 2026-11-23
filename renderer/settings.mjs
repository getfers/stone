import { setLanguage, setMessage } from './localization.mjs';

const api = window.stone;
const controls = [...document.querySelectorAll('[data-preference]')];
const status = document.querySelector('#preferences-status');
const autostart = document.querySelector('#autostart');
const startupHint = document.querySelector('#startup-hint');
let settings;

function updateOutput(control) {
  const output = document.querySelector(`output[for="${control.id}"]`);
  if (output) output.value = control.value + '%';
}

function render(next) {
  settings = next;
  setLanguage(settings.language);
  for (const control of controls) {
    const value = settings[control.dataset.preference];
    if (control.type === 'checkbox') control.checked = value;
    else if (!control.matches('input[type="range"]:active')) control.value = value;
    updateOutput(control);
  }
  startupHint.hidden = settings.startupMode !== 'default';
}

for (const control of controls) {
  control.addEventListener('input', () => updateOutput(control));
  control.addEventListener('change', async () => {
    const key = control.dataset.preference;
    let value = control.value;
    if (key === 'fps' || control.type === 'range') value = Number(value);
    if (control.type === 'checkbox') value = control.checked;
    setMessage(status, '');
    try {
      render(await api.updatePreference(key, value));
    } catch {
      render(settings);
      setMessage(status, key === 'autostart'
        ? 'Не удалось изменить автозапуск в Windows.' : 'Не удалось сохранить настройку.');
    }
  });
}

api.preferences().then(initial => {
  render(initial);
  document.querySelector('#language').disabled = false;
  autostart.disabled = !initial.canAutostart;
  document.querySelector('#autostart-hint').hidden = initial.canAutostart;
  for (const group of document.querySelectorAll('fieldset')) group.disabled = false;
}).catch(() => { setMessage(status, 'Не удалось загрузить настройки.'); });

api.onPreferences(render);
