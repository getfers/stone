export const sounds = {
  chime: 'Колокольчики',
  morning: 'Утро',
  pulse: 'Импульс'
};

export const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
export const alarmVolume = percent => 0.65 * percent / 100;

export function alarmAudio(sound, percent) {
  const audio = new Audio(new URL('../assets/sounds/alarm-' + sound + '.wav', import.meta.url));
  audio.volume = alarmVolume(percent);
  return audio;
}
