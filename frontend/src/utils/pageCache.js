const cache = {};

export function getCache(key) {
  return cache[key];
}

export function setCache(key, data) {
  cache[key] = data;
}
