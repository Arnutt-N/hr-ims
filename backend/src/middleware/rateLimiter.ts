import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { getRateLimitSettings, isFeatureEnabled } from '../utils/settings';

/**
 * Rate Limiting Middleware
 * จำกัดจำนวนการเรียก API ต่อช่วงเวลา
 * สามารถเปิด/ปิดได้จาก System Settings
 */

// Store สำหรับเก็บ middleware instances
let apiLimiterInstance: ReturnType<typeof rateLimit> | null = null;
let authLimiterInstance: ReturnType<typeof rateLimit> | null = null;

/**
 * สร้าง API Rate Limiter
 * จำกัดทั่วไปสำหรับทุก API endpoint
 */
export async function createApiLimiter() {
    const settings = await getRateLimitSettings();

    return rateLimit({
        windowMs: settings.windowMs,
        max: settings.maxRequests,
        standardHeaders: true,
        legacyHeaders: false,
        skip: async (req) => {
            // ข้ามถ้าไม่เปิดใช้งาน
            const enabled = await isFeatureEnabled('rateLimit');
            return !enabled;
        },
        handler: (req: Request, res: Response) => {
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'คุณส่งคำขอมากเกินไป กรุณาลองใหม่ภายหลัง',
                retryAfter: Math.ceil(settings.windowMs / 1000)
            });
        },
        keyGenerator: (req: Request) => {
            // ใช้ IP หรือ User ID (ถ้ามี)
            return (req as any).user?.id?.toString() || req.ip || 'unknown';
        }
    });
}

/**
 * สร้าง Auth Rate Limiter
 * จำกัดสำหรับการ Login และ Register
 */
export async function createAuthLimiter() {
    const settings = await getRateLimitSettings();

    return rateLimit({
        windowMs: settings.windowMs,
        max: settings.authMaxRequests,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // ไม่นับเมื่อสำเร็จ
        skip: async (req) => {
            const enabled = await isFeatureEnabled('rateLimit');
            return !enabled;
        },
        handler: (req: Request, res: Response) => {
            res.status(429).json({
                error: 'Too Many Login Attempts',
                message: 'คุณพยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ใน 15 นาที',
                retryAfter: Math.ceil(settings.windowMs / 1000)
            });
        },
        keyGenerator: (req: Request) => {
            return req.ip || 'unknown';
        }
    });
}

/**
 * สร้าง Strict Rate Limiter
 * สำหรับ endpoint ที่ต้องการความเข้มงวดเป็นพิเศษ
 */
export async function createStrictLimiter() {
    const settings = await getRateLimitSettings();

    return rateLimit({
        windowMs: 60000, // 1 นาที
        max: 10, // 10 ครั้งต่อนาที
        standardHeaders: true,
        legacyHeaders: false,
        skip: async (req) => {
            const enabled = await isFeatureEnabled('rateLimit');
            return !enabled;
        },
        handler: (req: Request, res: Response) => {
            res.status(429).json({
                error: 'Rate Limit Exceeded',
                message: 'กรุณาลองใหม่ภายหลัง',
                retryAfter: 60
            });
        }
    });
}

/**
 * Middleware แบบ Dynamic
 * อ่านค่าจาก Database ทุกครั้ง (สำหรับ Development)
 */
export function dynamicRateLimit() {
    return async (req: Request, res: Response, next: Function) => {
        const enabled = await isFeatureEnabled('rateLimit');

        if (!enabled) {
            return next();
        }

        // สร้าง middleware instance ถ้ายังไม่มี
        if (!apiLimiterInstance) {
            apiLimiterInstance = await createApiLimiter();
        }

        return apiLimiterInstance(req, res, next);
    };
}

/**
 * รีเซ็ต Rate Limiter Instances
 * ใช้เมื่อมีการอัปเดต Settings
 */
export function resetRateLimiters(): void {
    apiLimiterInstance = null;
    authLimiterInstance = null;
}

// Export สำหรับใช้งานโดยตรง
export { apiLimiterInstance as apiLimiter, authLimiterInstance as authLimiter };
