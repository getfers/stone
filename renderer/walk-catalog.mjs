export const walks = {
  forest: {
    name: 'Ночной лес',
    description: 'Тропа среди елей и светлячков.',
    wardrobe: ['leaf'],
    stops: [
      { id: 'pine', name: 'Старая ель', x: 22, y: 65 },
      { id: 'moss', name: 'Мягкий мох', x: 50, y: 81 },
      { id: 'lights', name: 'Светлячки', x: 78, y: 57 }
    ]
  },
  picnic: {
    name: 'Уютный парк',
    description: 'Тихие аллеи, фонарь и место для отдыха.',
    wardrobe: ['bow'],
    stops: [
      { id: 'bench', name: 'Скамейка', x: 21, y: 65 },
      { id: 'lamp', name: 'Фонарь', x: 55, y: 55 },
      { id: 'flowers', name: 'Клумба', x: 79, y: 76 }
    ]
  },
  beach: {
    name: 'Берег озера',
    description: 'Гладкая вода и песчаный берег.',
    wardrobe: ['shell'],
    stops: [
      { id: 'reeds', name: 'Камыши', x: 19, y: 62 },
      { id: 'dock', name: 'Причал', x: 55, y: 51 },
      { id: 'pebbles', name: 'Галька', x: 81, y: 78 }
    ]
  },
  mountain: {
    name: 'Горная тропа',
    description: 'Извилистый подъём к смотровой площадке.',
    wardrobe: ['leaf', 'bow', 'shell'],
    stops: [
      { id: 'cairn', name: 'Каменная пирамидка', x: 19, y: 75 },
      { id: 'sign', name: 'Указатель', x: 51, y: 62 },
      { id: 'lookout', name: 'Смотровая площадка', x: 79, y: 49 }
    ]
  }
};

export const finds = {
  berry: { name: 'Лесная ягода', gains: { food: 10, mood: 4 } },
  water: { name: 'Родниковая вода', gains: { water: 12, energy: 4 } },
  stone: { name: 'Гладкий камешек', gains: { mood: 6, fun: 7 } }
};
