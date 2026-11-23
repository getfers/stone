import { alarmAudio, alarmVolume, sounds, weekdays, weekdayOrder } from './organizer-catalog.mjs';

const api = window.stone;
const $ = id => document.getElementById(id);
const noteForm = $('note-form');
const alarmForm = $('alarm-form');
const alarmSound = $('alarm-sound');
const status = $('editor-status');
const list = $('organizer-list');
const empty = $('organizer-empty');
const dialog = $('delete-dialog');
const sections = {
  notes: {
    title: 'Заметки', subtitle: 'Записывайте идеи и назначайте напоминания.',
    empty: 'Здесь появятся ваши заметки и напоминания.',
    create: 'Новая заметка', edit: 'Редактировать заметку', remove: 'Удалить заметку?'
  },
  alarms: {
    title: 'Будильники', subtitle: 'Настройте время, повтор и звуковой сигнал.',
    empty: 'Здесь появятся ваши будильники.',
    create: 'Новый будильник', edit: 'Редактировать будильник', remove: 'Удалить будильник?'
  }
};
const dateTime = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
const tabs = [...document.querySelectorAll('[data-section]')];
const deletes = [...document.querySelectorAll('.editor-delete')];
let section = 'notes';
let state = { notes: [], alarms: [] };
let selected;
let preview;
let volume = 100;
let busy = false;
let dirty = false;

for (const [value, label] of Object.entries(sounds)) alarmSound.add(new Option(label, value));
for (const day of weekdayOrder) {
  const label = document.createElement('label');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.value = day;
  const title = document.createElement('span');
  title.textContent = weekdays[day];
  label.append(input, title);
  $('alarm-days').append(label);
}
const days = [...$('alarm-days').querySelectorAll('input')];

function localInput(timestamp) {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function stopPreview() {
  preview?.pause();
  preview = null;
  $('preview-sound').textContent = 'Прослушать';
}

function fill(entry) {
  stopPreview();
  dirty = false;
  selected = entry?.id;
  const info = sections[section];
  $('editor-title').textContent = entry ? info.edit : info.create;
  $('new-entry').hidden = !entry;
  for (const button of deletes) button.hidden = !entry;
  status.textContent = '';
  noteForm.reset();
  alarmForm.reset();
  if (!entry) return;
  if (section === 'notes') {
    $('note-text').value = entry.text;
    $('note-at').value = entry.at ? localInput(entry.at) : '';
  } else {
    $('alarm-time').value = entry.time;
    $('alarm-label').value = entry.label;
    alarmSound.value = entry.sound;
    $('alarm-enabled').checked = Boolean(entry.nextAt || entry.snoozeAt || state.ringing?.includes(entry.id));
    for (const input of days) input.checked = entry.days.includes(Number(input.value));
  }
}

function showSection(next) {
  if (next !== section && dirty && !confirm('Перейти к другому разделу? Несохранённые изменения будут потеряны.')) return;
  if (next !== section) {
    section = next;
    fill();
  }
  const info = sections[section];
  $('organizer-title').textContent = info.title;
  $('organizer-subtitle').textContent = info.subtitle;
  for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.section === section));
  noteForm.hidden = section !== 'notes';
  alarmForm.hidden = section !== 'alarms';
  renderList();
}

function edit(entry) {
  if (entry?.id === selected && entry) {
    focusEditor();
    return;
  }
  if (dirty && !confirm('Открыть другую запись? Несохранённые изменения будут потеряны.')) return;
  fill(entry);
  renderList();
  focusEditor();
}

function focusEditor() {
  (section === 'notes' ? $('note-text') : $('alarm-time')).focus();
}

function renderList() {
  const lastFocus = document.activeElement?.id;
  const info = sections[section];
  empty.hidden = state[section].length > 0;
  empty.textContent = info.empty;
  const items = state[section].map(entry => {
    const item = document.createElement('li');
    item.className = 'record';
    const open = document.createElement('button');
    open.type = 'button';
    open.id = 'open-' + entry.id;
    open.className = 'record-open';
    open.setAttribute('aria-pressed', String(selected === entry.id));
    const title = document.createElement('strong');
    const description = document.createElement('small');
    if (section === 'notes') {
      title.textContent = entry.text;
      description.textContent = entry.at
        ? (entry.fired ? 'Сработало · ' : 'Напоминание · ') + dateTime.format(entry.at)
        : 'Заметка';
    } else {
      title.textContent = entry.time + (entry.label ? ' · ' + entry.label : '');
      const repeat = entry.days.length ? weekdayOrder.filter(d => entry.days.includes(d)).map(d => weekdays[d]).join(', ') : 'Один раз';
      const when = entry.snoozeAt ? 'Отложен до ' + dateTime.format(entry.snoozeAt) : repeat;
      description.textContent = when + ' · ' + sounds[entry.sound];
    }
    open.append(title, description);
    open.addEventListener('click', () => edit(entry));
    item.append(open);
    if (section === 'alarms') {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.id = 'toggle-' + entry.id;
      toggle.className = 'alarm-toggle';
      toggle.setAttribute('aria-label', 'Будильник ' + title.textContent);
      toggle.setAttribute('role', 'switch');
      toggle.setAttribute('aria-checked', String(Boolean(entry.nextAt || entry.snoozeAt || state.ringing?.includes(entry.id))));
      toggle.addEventListener('click', () => mutate('toggle', { id: entry.id }));
      item.append(toggle);
    }
    return item;
  });
  list.replaceChildren(...items);
  if (lastFocus?.startsWith('open-') || lastFocus?.startsWith('toggle-')) $(lastFocus)?.focus();
}

async function mutate(action, data) {
  if (busy) return;
  busy = true;
  const currentSection = section;
  status.textContent = '';
  try {
    state = await api.updateOrganizer(currentSection, action, data);
    if (section === currentSection && action !== 'toggle') {
      const entry = action === 'save' ? state[section].find(item => item.id === data.id) : null;
      fill(entry);
    }
    if (section === currentSection && action === 'toggle' && selected === data.id && !dirty) {
      fill(state.alarms.find(item => item.id === data.id));
    }
    renderList();
    if (section === currentSection) {
      status.textContent = { save: 'Сохранено', delete: 'Удалено', toggle: 'Состояние будильника изменено' }[action];
    }
  } catch (error) {
    status.textContent = error.message.includes('future')
      ? 'Укажите будущие дату и время.' : 'Не удалось сохранить изменение.';
  } finally {
    busy = false;
  }
}

noteForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = $('note-text').value.trim();
  if (!text) {
    status.textContent = 'Введите текст заметки.';
    $('note-text').focus();
    return;
  }
  const time = $('note-at').value;
  const previous = state.notes.find(item => item.id === selected);
  const at = time ? new Date(time).getTime() : null;
  mutate('save', { id: selected, text, at: previous?.at && time === localInput(previous.at) ? previous.at : at });
});
alarmForm.addEventListener('submit', event => {
  event.preventDefault();
  mutate('save', {
    id: selected, time: $('alarm-time').value, label: $('alarm-label').value,
    days: days.filter(input => input.checked).map(input => Number(input.value)),
    sound: alarmSound.value, enabled: $('alarm-enabled').checked
  });
});
for (const form of [noteForm, alarmForm]) form.addEventListener('input', () => { dirty = true; });
for (const tab of tabs) tab.addEventListener('click', () => showSection(tab.dataset.section));
$('new-entry').addEventListener('click', () => edit());
for (const button of deletes) button.addEventListener('click', () => {
  $('delete-title').textContent = sections[section].remove;
  dialog.returnValue = '';
  dialog.showModal();
});
dialog.addEventListener('close', () => {
  if (dialog.returnValue === 'delete' && selected) mutate('delete', { id: selected });
});
alarmSound.addEventListener('change', stopPreview);
$('preview-sound').addEventListener('click', () => {
  if (preview) {
    stopPreview();
    return;
  }
  const audio = alarmAudio(alarmSound.value, volume);
  preview = audio;
  $('preview-sound').textContent = 'Остановить';
  audio.addEventListener('ended', stopPreview, { once: true });
  audio.play().catch(() => {
    if (preview !== audio) return;
    stopPreview();
    status.textContent = 'Не удалось воспроизвести сигнал.';
  });
});

function applyVolume(settings) {
  volume = settings.volume;
  if (preview) preview.volume = alarmVolume(volume);
}

api.onPreferences(applyVolume);
api.preferences().then(applyVolume).catch(() => {});

api.onOrganizerState(next => {
  state = next;
  renderList();
});
api.onOrganizerTab(showSection);
try {
  const initial = await api.organizer();
  state = initial.state;
  showSection(initial.tab);
} catch {
  status.textContent = 'Не удалось открыть органайзер.';
}
