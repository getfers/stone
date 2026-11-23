import { translate } from './i18n.mjs';

let language = 'ru';
const listeners = new Set();

export const t = (text, values) => translate(language, text, values);
export const locale = () => language === 'en' ? 'en-US' : 'ru-RU';
export const onLanguage = callback => listeners.add(callback);

export function localize(element = document) {
  for (const [attribute, target] of [
    ['data-i18n', 'textContent'],
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-placeholder', 'placeholder']
  ]) {
    for (const node of element.querySelectorAll('[' + attribute + ']')) {
      const text = t(node.getAttribute(attribute));
      if (target === 'textContent') node.textContent = text;
      else node.setAttribute(target, text);
    }
  }
}

export function setLanguage(next) {
  if (next === language) return;
  language = next;
  document.documentElement.lang = language;
  localize();
  for (const listener of listeners) listener();
}

export function setMessage(node, text) {
  if (text) node.dataset.i18n = text;
  else delete node.dataset.i18n;
  node.textContent = t(text);
}

setLanguage(new URLSearchParams(location.search).get('language') === 'en' ? 'en' : 'ru');
