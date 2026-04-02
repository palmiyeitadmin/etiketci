/**
 * LRU (Least Recently Used) Cache Manager
 * 
 * Features:
 * - LRU eviction policy (removes least recently used items when at capacity)
 * - TTL (Time To Live) support (expires items after specified time)
 * - Thread-safe operations
 * - Performance monitoring
 */

export class CacheManager<T> {
    private cache = new Map<string, { value: T; timestamp: number }>();
    private accessOrder: string[] = [];
    private maxItems: number;
    private maxAge: number; // milliseconds
    private hits = 0;
    private misses = 0;

    constructor(maxItems: number = 100, maxAge: number = 5 * 60 * 1000) {
        this.maxItems = maxItems;
        this.maxAge = maxAge;
    }

    /**
     * Get a value from cache
     * @param key - Cache key
     * @returns Cached value or undefined if not found or expired
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }

        // Check age (TTL)
        const age = Date.now() - entry.timestamp;
        if (age > this.maxAge) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            this.misses++;
            return undefined;
        }

        // Update access order (move to end = most recently used)
        this.updateAccessOrder(key);
        
        // Refresh timestamp to extend TTL
        entry.timestamp = Date.now();
        
        this.hits++;
        return entry.value;
    }

    /**
     * Set a value in cache
     * @param key - Cache key
     * @param value - Value to cache
     */
    set(key: string, value: T): void {
        const existing = this.cache.has(key);
        this.cache.set(key, { value, timestamp: Date.now() });
        
        if (existing) {
            // Update access order for existing key
            this.updateAccessOrder(key);
        } else {
            // Add new key
            this.accessOrder.push(key);
            this.evictIfNeeded();
        }
    }

    /**
     * Check if key exists and is not expired
     * @param key - Cache key
     * @returns true if key exists and is valid
     */
    has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    /**
     * Delete a specific key from cache
     * @param key - Cache key
     * @returns true if key was deleted
     */
    delete(key: string): boolean {
        const existed = this.cache.delete(key);
        if (existed) {
            this.removeFromAccessOrder(key);
        }
        return existed;
    }

    /**
     * Clear all items from cache
     */
    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get cache statistics
     * @returns Cache stats including size, hits, misses, and hit rate
     */
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: `${hitRate.toFixed(2)}%`,
            totalAccesses: total,
        };
    }

    /**
     * Get current cache size
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Evict least recently used items if cache is at capacity
     */
    private evictIfNeeded(): void {
        while (this.cache.size > this.maxItems) {
            const oldestKey = this.accessOrder.shift();
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
    }

    /**
     * Update access order - move key to end (most recently used)
     */
    private updateAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            // Remove from current position
            this.accessOrder.splice(index, 1);
        }
        // Add to end (most recently used)
        this.accessOrder.push(key);
    }

    /**
     * Remove key from access order
     */
    private removeFromAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }
}

/**
 * Global cache instances for different use cases
 */

// Image cache - stores loaded images
// Max: 100 items, TTL: 10 minutes
export const imageCache = new CacheManager<HTMLImageElement>(100, 10 * 60 * 1000);

// Generated code cache - stores generated barcode/QR codes
// Max: 50 items, TTL: 30 minutes (generation is expensive)
export const generatedCodeCache = new CacheManager<string>(50, 30 * 60 * 1000);

// Element preview cache - stores rendered element previews
// Max: 200 items, TTL: 5 minutes
export const elementPreviewCache = new CacheManager<string>(200, 5 * 60 * 1000);
