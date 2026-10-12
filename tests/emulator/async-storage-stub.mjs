// In-memory stand-in for @react-native-async-storage/async-storage.
const store = new Map();
export default {
  getItem: async (key) => (store.has(key) ? store.get(key) : null),
  setItem: async (key, value) => void store.set(key, String(value)),
  removeItem: async (key) => void store.delete(key),
  getAllKeys: async () => [...store.keys()],
  multiRemove: async (keys) => keys.forEach((key) => store.delete(key)),
  multiGet: async (keys) => keys.map((key) => [key, store.has(key) ? store.get(key) : null]),
  multiSet: async (pairs) => pairs.forEach(([key, value]) => store.set(key, String(value))),
  clear: async () => store.clear(),
};
