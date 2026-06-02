// Simple in-memory cache with TTL
class Cache {
    constructor() {
        this.cache = new Map();
    }

    set(key, value, ttlMs = 5 * 60 * 1000) { // Default 5 minutes TTL
        const expiresAt = Date.now() + ttlMs;
        this.cache.set(key, { value, expiresAt });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    clear() {
        this.cache.clear();
    }

    delete(key) {
        return this.cache.delete(key);
    }
}

export const apiCache = new Cache();