import { Request, Response, NextFunction } from 'express';
import { logInfo } from '../utils/logger';
import { isFeatureEnabled } from '../utils/settings';

/**
 * Request Logger Middleware
 * บันทึกทุก Request/Response ที่เข้ามา
 */

export function requestLogger() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const enabled = await isFeatureEnabled('logging');

        if (!enabled) {
            return next();
        }

        const start = Date.now();

        // เก็บข้อมูลก่อนส่งต่อ
        const { method, path, ip, headers } = req;
        const userAgent = headers['user-agent'];
        const userId = (req as any).user?.id;

        // รอจนกว่า Response จะเสร็จสิ้น
        res.on('finish', async () => {
            const duration = Date.now() - start;
            const statusCode = res.statusCode;

            // บันทึก Log
            await logInfo('API Request', {
                method,
                path,
                statusCode,
                duration: `${duration}ms`,
                ip,
                userAgent,
                userId,
                timestamp: new Date().toISOString(),
            });
        });

        next();
    };
}

/**
 * Error Logger Middleware
 * บันทึก Error ที่เกิดขึ้น
 */

export function errorLogger() {
    return async (err: Error, req: Request, res: Response, next: NextFunction) => {
        const enabled = await isFeatureEnabled('logging');

        if (enabled) {
            const { logError } = await import('../utils/logger');
            await logError('API Error', {
                error: err.message,
                stack: err.stack,
                path: req.path,
                method: req.method,
                userId: (req as any).user?.id,
                timestamp: new Date().toISOString(),
            });
        }

        next(err);
    };
}
