const fs = require('node:fs');
const path = require('node:path');

function readJson(file) {
  for (const candidate of [file, file + '.bak']) {
    try {
      const data = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (data && typeof data === 'object' && !Array.isArray(data)) return data;
      throw new Error('Expected a JSON object');
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn('Could not read %s: %s', candidate, error.message);
    }
  }
  return {};
}

function atomicWrite(file, data) {
  const temp = file + '.tmp';
  const descriptor = fs.openSync(temp, 'w', 0o600);
  try {
    fs.writeFileSync(descriptor, data);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  fs.renameSync(temp, file);
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let previous;
  try {
    previous = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(previous);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) previous = undefined;
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    previous = undefined;
  }
  if (previous) atomicWrite(file + '.bak', previous);
  atomicWrite(file, JSON.stringify(data) + '\n');
}

module.exports = { readJson, writeJson };
