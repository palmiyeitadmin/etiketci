import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '@/utils/cache/CacheManager';

describe('CacheManager', () => {
    let cache: CacheManager<string>;

    beforeEach(() => {
        cache = new CacheManager<string>(3, 1000); // 3 items, 1 second TTL
    });

    describe('Basic Operations', () => {
        it('should store and retrieve values', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        it('should return undefined for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        it('should update existing keys', () => {
            cache.set('key1', 'value1');
            cache.set('key1', 'value2');
            expect(cache.get('key1')).toBe('value2');
        });

        it('should delete keys', () => {
            cache.set('key1', 'value1');
            expect(cache.delete('key1')).toBe(true);
            expect(cache.get('key1')).toBeUndefined();
        });

        it('should return false when deleting non-existent keys', () => {
            expect(cache.delete('nonexistent')).toBe(false);
        });

        it('should clear all items', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            cache.clear();
            expect(cache.size).toBe(0);
            expect(cache.get('key1')).toBeUndefined();
        });
    });

    describe('LRU Eviction', () => {
        it('should evict least recently used items when at capacity', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            
            // Access key1 (now most recently used)
            cache.get('key1');
            
            // Add 4th item - should evict key2 (least recently used)
            cache.set('key4', 'value4');
            
            expect(cache.size).toBe(3);
            expect(cache.get('key1')).toBe('value1'); // Still there
            expect(cache.get('key2')).toBeUndefined(); // Evicted
            expect(cache.get('key3')).toBe('value3'); // Still there
            expect(cache.get('key4')).toBe('value4'); // New item
        });

        it('should evict oldest items in FIFO order when not accessed', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            
            // Add 4th item - should evict key1
            cache.set('key4', 'value4');
            
            expect(cache.get('key1')).toBeUndefined();
            expect(cache.get('key2')).toBe('value2');
            expect(cache.get('key3')).toBe('value3');
            expect(cache.get('key4')).toBe('value4');
        });

        it('should update access order on get', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            
            // Access key1
            cache.get('key1');
            
            // Add 4th item - should evict key2
            cache.set('key4', 'value4');
            
            expect(cache.get('key1')).toBe('value1'); // Updated order
            expect(cache.get('key2')).toBeUndefined(); // Evicted
        });

        it('should update access order on set', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            
            // Update key2 (now most recently used)
            cache.set('key2', 'value2-updated');
            
            // Add 4th item - should evict key1 (least recently used)
            cache.set('key4', 'value4');
            
            expect(cache.get('key1')).toBeUndefined(); // Evicted
            expect(cache.get('key2')).toBe('value2-updated'); // Updated and preserved
            expect(cache.get('key3')).toBe('value3');
            expect(cache.get('key4')).toBe('value4');
        });
    });

    describe('TTL (Time To Live)', () => {
        it('should expire items after TTL', async () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
            
            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 1100));
            
            expect(cache.get('key1')).toBeUndefined();
        });

        it('should not expire items before TTL', async () => {
            cache.set('key1', 'value1');
            
            // Wait half of TTL
            await new Promise(resolve => setTimeout(resolve, 500));
            
            expect(cache.get('key1')).toBe('value1');
        });

        it('should refresh timestamp on update', async () => {
            cache.set('key1', 'value1');
            
            // Wait half of TTL
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Update key - should refresh TTL
            cache.set('key1', 'value1-updated');
            
            // Wait another 600ms (total 1100ms from first set, 600ms from update)
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Should still be there (update refreshed TTL)
            expect(cache.get('key1')).toBe('value1-updated');
        });

        it('should refresh timestamp on get', async () => {
            cache.set('key1', 'value1');
            
            // Wait half of TTL
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Access key - should refresh TTL
            cache.get('key1');
            
            // Wait another 600ms (total 1100ms from first set, 600ms from access)
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Should still be there (get refreshed TTL)
            expect(cache.get('key1')).toBe('value1');
        });
    });

    describe('Statistics', () => {
        it('should track cache hits and misses', () => {
            cache.set('key1', 'value1');
            cache.get('key1'); // hit
            cache.get('key1'); // hit
            cache.get('nonexistent'); // miss
            
            const stats = cache.getStats();
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(1);
            expect(stats.totalAccesses).toBe(3);
        });

        it('should calculate hit rate correctly', () => {
            cache.set('key1', 'value1');
            cache.get('key1'); // hit
            cache.get('key2'); // miss
            
            const stats = cache.getStats();
            expect(stats.hitRate).toBe('50.00%');
        });

        it('should handle empty cache stats', () => {
            const stats = cache.getStats();
            expect(stats.size).toBe(0);
            expect(stats.hits).toBe(0);
            expect(stats.misses).toBe(0);
            expect(stats.hitRate).toBe('0.00%');
            expect(stats.totalAccesses).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string keys', () => {
            cache.set('', 'value');
            expect(cache.get('')).toBe('value');
        });

        it('should handle special characters in keys', () => {
            cache.set('key-with-dashes', 'value1');
            cache.set('key_with_underscores', 'value2');
            cache.set('key.with.dots', 'value3');
            
            expect(cache.get('key-with-dashes')).toBe('value1');
            expect(cache.get('key_with_underscores')).toBe('value2');
            expect(cache.get('key.with.dots')).toBe('value3');
        });

        it('should handle null and undefined values', () => {
            cache.set('key1', null as any);
            cache.set('key2', undefined as any);
            
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeUndefined();
        });

        it('should handle concurrent operations', () => {
            // Set 100 items concurrently
            for (let i = 0; i < 100; i++) {
                cache.set(`key${i}`, `value${i}`);
            }
            
            // Should only have maxItems (3)
            expect(cache.size).toBe(3);
            
            // Should be able to get remaining items
            expect(cache.get('key99')).toBeDefined();
            expect(cache.get('key98')).toBeDefined();
            expect(cache.get('key97')).toBeDefined();
        });
    });

    describe('Global Cache Instances', () => {
        it('should have configured cache instances', async () => {
            // The global instances are created in the module
            // We just verify they exist and are functional
            const { imageCache, generatedCodeCache, elementPreviewCache } = await import('@/utils/cache/CacheManager');
            
            expect(imageCache).toBeInstanceOf(CacheManager);
            expect(generatedCodeCache).toBeInstanceOf(CacheManager);
            expect(elementPreviewCache).toBeInstanceOf(CacheManager);
        });
    });
});
