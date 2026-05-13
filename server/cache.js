const store = new Map();
const inflight = new Map();

export async function cached(key, ttlMs, loader, opts = {}) {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value;

  const pending = inflight.get(key);
  if (pending) return pending;

  const shouldCache = opts.shouldCache ?? (() => true);

  const promise = (async () => {
    try {
      const value = await loader();
      if (shouldCache(value)) {
        store.set(key, { value, expiresAt: Date.now() + ttlMs });
      } else {
        store.delete(key);
      }
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
