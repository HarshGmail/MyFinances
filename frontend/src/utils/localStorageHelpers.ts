/**
 * Stores a value (object or string) in localStorage under the given key.
 * If the value is an object, it is stringified as JSON.
 */
export function setItemToLocalStorage(key: string, value: unknown) {
  if (typeof value === 'string') {
    localStorage.setItem(key, value);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/**
 * Retrieves a value from localStorage by key.
 * If the value is valid JSON, it is parsed and returned as an object.
 * Otherwise, the raw string is returned.
 */
export function getItemFromLocalStorage<T = unknown>(key: string): T | string | null {
  const item = localStorage.getItem(key);
  if (item === null) return null;
  try {
    return JSON.parse(item) as T;
  } catch {
    return item;
  }
}
