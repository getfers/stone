import { english } from './translations.mjs';

export function message(text, values = {}) {
  return { text, values };
}

export function translate(language, message, values) {
  if (typeof message === 'object') {
    values = message.values;
    message = message.text;
  }
  const text = language === 'en' && Object.hasOwn(english, message) ? english[message] : message;
  return text.replace(/\{(\w+)\}/g, (placeholder, key) => values?.[key] ?? placeholder);
}
