import NodeCache from 'node-cache';
import { getCachingSettings, isFeatureEnabled } from './settings';

/**
 * Cache Service
 * จัดการการแคชข้อมูลด้วย NodeCache
 */

let cacheInstance: NodeCache | null = null;

/**
 * สร้าง Cache instance
 */
export async function createCache(): Promise<NodeCache> {
    const settings = await getCachingSettings();

    return new NodeCache({
        stdTTL: settings.defaultTTL,
        maxKeys: settings.maxSize,
        checkperiod: 60, // ตรวจสอบทุก 60 วินาที
        useClones: false, // ไม่ clone เพื่อประสิทธิภาพ
    });
}

/**
 * ดึง Cache instance
 */
export async function getCache(): Promise<NodeCache | null> {
    const enabled = await isFeatureEnabled('caching');

    if (!enabled) {
        return null;
    }

    if (!cacheInstance) {
        cacheInstance = await createCache();
    }

    return cacheInstance;
}

/**
 * รีเซ็ต Cache (ใช้เมื่อมีการอัปเดต Settings)
 */
export function resetCache(): void {
    if (cacheInstance) {
        cacheInstance.close();
        cacheInstance = null;
    }
}

/**
 * ดึงข้อมูลจาก Cache
 */
export async function cacheGet<T>(key: string): Promise<T | undefined> {
    const cache = await getCache();
    if (!cache) return undefined;

    return cache.get<T>(key);
}

/**
 * บันทึกข้อมูลลง Cache
 */
export async function cacheSet<T>(
    key: string,
    value: T,
    ttl?: number
): Promise<boolean> {
    const cache = await getCache();
    if (!cache) return false;

    if (ttl !== undefined) {
        return cache.set(key, value, ttl);
    }
    return cache.set(key, value);
}

/**
 * ลบข้อมูลจาก Cache
 */
export async function cacheDel(key: string): Promise<number> {
    const cache = await getCache();
    if (!cache) return 0;

    return cache.del(key);
}

/**
 * ล้าง Cache ทั้งหมด
 */
export async function cacheFlush(): Promise<void> {
    const cache = await getCache();
    if (!cache) return;

    cache.flushAll();
}

/**
 * ดึงสถิติ Cache
 */
export async function cacheStats(): Promise<{
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
}> {
    const cache = await getCache();
    if (!cache) {
        return { keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 };
    }

    return cache.getStats();
}

/**
 * Cache Middleware สำหรับ Express
 * ใช้แคช Response ของ GET requests
 */
export function cacheMiddleware(ttl?: number) {
    return async (req: any, res: any, next: any) => {
        // แคชเฉพาะ GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const cache = await getCache();
        if (!cache) {
            return next();
        }

        const key = `cache:${req.originalUrl || req.url}`;

        try {
            // ตรวจสอบว่ามีใน Cache หรือไม่
            const cached = cache.get(key);
            if (cached) {
                return res.json(cached);
            }

            // แทนที่ res.json เพื่อบันทึกลง Cache
            const originalJson = res.json.bind(res);
            res.json = (body: any) => {
                if (ttl !== undefined) {
                    cache.set(key, body, ttl);
                } else {
                    cache.set(key, body);
                }
                return originalJson(body);
            };

            next();
        } catch (error) {
            next();
        }
    };
}

/**
 * Invalidate Cache ตาม Pattern
 * ใช้เมื่อมีการอัปเดตข้อมูล
 */
export async function invalidateCache(pattern: string): Promise<void> {
    const cache = await getCache();
    if (!cache) return;

    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.includes(pattern));

    for (const key of matchingKeys) {
        cache.del(key);
    }
}
