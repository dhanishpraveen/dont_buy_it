type CacheEntry<T> = {
  version: 1;
  data: T;
  timestamp: number;
  expiresAt: number;
};

const storagePrefix = "dontbuyit:";

function storageKey(key: string) {
  return `${storagePrefix}${key}`;
}

export function getCacheEntry<T>(key: string): T | undefined {
  try {
    const serialized = window.localStorage.getItem(storageKey(key));
    if (!serialized) return undefined;
    const entry = JSON.parse(serialized) as Partial<CacheEntry<T>>;
    if (
      entry.version !== 1 ||
      typeof entry.timestamp !== "number" ||
      typeof entry.expiresAt !== "number" ||
      !("data" in entry)
    ) {
      window.localStorage.removeItem(storageKey(key));
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      window.localStorage.removeItem(storageKey(key));
      return undefined;
    }
    return entry.data as T;
  } catch {
    try {
      window.localStorage.removeItem(storageKey(key));
    } catch {
      /* Storage can be unavailable. */
    }
    return undefined;
  }
}

export function setCacheEntry<T>(key: string, data: T, ttlMs: number): void {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;
  const timestamp = Date.now();
  const entry: CacheEntry<T> = {
    version: 1,
    data,
    timestamp,
    expiresAt: timestamp + ttlMs,
  };
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    /* Cache writes must never block the app. */
  }
}

export function removeCacheEntry(key: string): void {
  try {
    window.localStorage.removeItem(storageKey(key));
  } catch {
    /* Storage can be unavailable. */
  }
}

export function clearCacheByPrefix(prefix: string): void {
  try {
    const fullPrefix = storageKey(prefix);
    const matches: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(fullPrefix)) matches.push(key);
    }
    matches.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* Cache invalidation must never block a mutation. */
  }
}

export const cacheTtl = {
  listings: 3 * 60 * 1000,
  listingDetails: 3 * 60 * 1000,
  dashboard: 90 * 1000,
  myListings: 90 * 1000,
  requests: 45 * 1000,
  exchanges: 45 * 1000,
} as const;

function privateKey(userId: string, key: string) {
  return `private:${userId}:${key}`;
}

export const cacheKeys = {
  browse: (query: unknown, userId?: string) =>
    userId
      ? privateKey(
          userId,
          `browse:v1:${encodeURIComponent(JSON.stringify(query))}`,
        )
      : `public:browse:v1:${encodeURIComponent(JSON.stringify(query))}`,
  listing: (id: string, userId?: string) =>
    userId
      ? privateKey(userId, `listing-detail:v1:${id}`)
      : `public:listing-detail:v1:${id}`,
  dashboard: (userId: string) => privateKey(userId, "dashboard:v1"),
  myListings: (userId: string) => privateKey(userId, "my-listings:v1"),
  requests: (userId: string, scope: "mine" | "received") =>
    privateKey(userId, `requests:v1:${scope}`),
  request: (userId: string, id: string) =>
    privateKey(userId, `request-detail:v1:${id}`),
  exchange: (userId: string, id: string) =>
    privateKey(userId, `exchange-detail:v1:${id}`),
};

export function invalidateListingCaches(): void {
  clearCacheByPrefix("public:browse:v1:");
  clearCacheByPrefix("public:listing-detail:v1:");
  clearCacheByPrefix("private:");
}

export function invalidateRequestCaches(): void {
  clearCacheByPrefix("private:");
}

export function invalidateExchangeCaches(): void {
  clearCacheByPrefix("private:");
  clearCacheByPrefix("public:browse:v1:");
  clearCacheByPrefix("public:listing-detail:v1:");
}

export function clearPrivateCache(): void {
  clearCacheByPrefix("private:");
}
