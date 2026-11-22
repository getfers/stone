export const needs = {
  energy: 'Бодрость',
  food: 'Сытость',
  water: 'Жажда утолена',
  mood: 'Настроение',
  clean: 'Чистота',
  fun: 'Интерес'
};

export const periods = { morning: 'Утро', day: 'День', evening: 'Вечер', night: 'Ночь' };

export const rooms = {
  meadow: 'Тихие холмы',
  studio: 'Уютная комната',
  garden: 'Тихий сад'
};

export const clothes = {
  cap: { name: 'Мятная шапочка', slot: 'hat' },
  glasses: { name: 'Круглые очки', slot: 'face' },
  scarf: { name: 'Ягодный шарф', slot: 'outfit' },
  leaf: { name: 'Лесной берет', slot: 'hat', from: 'forest' },
  bow: { name: 'Бант в клетку', slot: 'outfit', from: 'picnic' },
  shell: { name: 'Брошь-ракушка', slot: 'pin', from: 'beach' }
};

export const trips = {
  forest: {
    name: 'Лес', item: 'leaf', duration: 18,
    events: ['Камешек услышал, как дятел стучит по сосне.', 'Камешек отдохнул на мягком мху.']
  },
  picnic: {
    name: 'Пикник', item: 'bow', duration: 15,
    events: ['Камешек поделился крошками с воробьём.', 'На плед села любопытная бабочка.']
  },
  beach: {
    name: 'Пляж', item: 'shell', duration: 20,
    events: ['Волна оставила на песке кружевную пену.', 'Камешек проводил глазами бумажный кораблик.']
  }
};

export const care = {
  water: { name: 'Попить воды', message: 'Камешек попил чистой воды.', gains: { water: 42, energy: 9 } },
  food: { name: 'Покормить', message: 'Камешек съел ролл.', gains: { food: 35, mood: 3 } },
  steam: { name: 'Выпустить пар', message: 'Пых! Камешек расслабился.', gains: { mood: 13, fun: 5 } },
  clean: { name: 'Умыть', message: 'Камешек снова чистый.', gains: { clean: 45, mood: 4 } },
  play: { name: 'Поиграть', message: 'Камешек играет с мячиком.', gains: { mood: 12, fun: 24, energy: -5 } }
};
