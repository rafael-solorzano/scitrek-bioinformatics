// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/vitest';

// Node 25 exposes an incomplete experimental `localStorage` global unless a
// backing file is configured. Install a small Storage-compatible test double
// so the suite behaves consistently on the project's supported Node versions.
const localValues = new Map();
const testLocalStorage = {
  get length() {
    return localValues.size;
  },
  clear() {
    localValues.clear();
  },
  getItem(key) {
    const normalizedKey = String(key);
    return localValues.has(normalizedKey) ? localValues.get(normalizedKey) : null;
  },
  key(index) {
    return [...localValues.keys()][index] ?? null;
  },
  removeItem(key) {
    localValues.delete(String(key));
  },
  setItem(key, value) {
    localValues.set(String(key), String(value));
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: testLocalStorage,
});

if (!global.structuredClone) {
  global.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}
