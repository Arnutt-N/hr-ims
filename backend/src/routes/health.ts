import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import prisma from '../utils/prisma';
import { cacheStats } from '../utils/cache';
import { getLogsDir } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 */
router.get('/', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with system metrics
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed health status
 */
router.get('/detailed', requireAuth, async (req: Request, res: Response) => {
    try {
        // Database health
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;

        // Cache stats
        const cache = await cacheStats();

        // Memory usage
        const memUsage = process.memoryUsage();

        // Disk space (simplified)
        const logsDir = getLogsDir();
        let logSize = 0;
        try {
            const files = fs.readdirSync(logsDir);
            for (const file of files) {
                const stats = fs.statSync(path.join(logsDir, file));
                logSize += stats.size;
            }
        } catch {
            // Ignore errors
        }

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            services: {
                database: {
                    status: 'connected',
                    latency: `${dbLatency}ms`,
                },
                cache: {
                    status: cache.keys > 0 ? 'active' : 'inactive',
                    keys: cache.keys,
                    hits: cache.hits,
                    misses: cache.misses,
                },
            },
            system: {
                memory: {
                    used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
                    total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
                    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
                },
                logs: {
                    size: Math.round(logSize / 1024) + 'KB',
                    path: logsDir,
                },
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * @swagger
 * /health/admin:
 *   get:
 *     summary: Admin health check with all system details
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full system health status
 */
router.get('/admin', requireAuth, requireRole(['superadmin']), async (req: Request, res: Response) => {
    try {
        // Database stats
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;

        // Table counts
        const [
            userCount,
            inventoryCount,
            requestCount,
            warehouseCount,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.inventoryItem.count(),
            prisma.request.count(),
            prisma.warehouse.count(),
        ]);

        // Cache stats
        const cache = await cacheStats();

        // Memory usage
        const memUsage = process.memoryUsage();

        // Log files
        const logsDir = getLogsDir();
        let logFiles: { name: string; size: string }[] = [];
        let totalLogSize = 0;
        try {
            const files = fs.readdirSync(logsDir);
            for (const file of files) {
                const stats = fs.statSync(path.join(logsDir, file));
                totalLogSize += stats.size;
                logFiles.push({
                    name: file,
                    size: Math.round(stats.size / 1024) + 'KB',
                });
            }
        } catch {
            // Ignore errors
        }

        // Backup files
        const backupDir = process.env.BACKUP_PATH || './backups';
        let backupFiles: { name: string; size: string; date: string }[] = [];
        try {
            if (fs.existsSync(backupDir)) {
                const files = fs.readdirSync(backupDir);
                for (const file of files.slice(0, 10)) { // Last 10 backups
                    const stats = fs.statSync(path.join(backupDir, file));
                    backupFiles.push({
                        name: file,
                        size: Math.round(stats.size / 1024 / 1024) + 'MB',
                        date: stats.mtime.toISOString(),
                    });
                }
            }
        } catch {
            // Ignore errors
        }

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            platform: process.platform,
            services: {
                database: {
                    status: 'connected',
                    latency: `${dbLatency}ms`,
                    stats: {
                        users: userCount,
                        inventoryItems: inventoryCount,
                        requests: requestCount,
                        warehouses: warehouseCount,
                    },
                },
                cache: {
                    status: cache.keys > 0 ? 'active' : 'inactive',
                    keys: cache.keys,
                    hits: cache.hits,
                    misses: cache.misses,
                    ksize: cache.ksize,
                    vsize: cache.vsize,
                },
            },
            system: {
                memory: {
                    used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
                    total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
                    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
                    external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
                },
                cpu: process.cpuUsage(),
                logs: {
                    directory: logsDir,
                    totalSize: Math.round(totalLogSize / 1024) + 'KB',
                    files: logFiles,
                },
                backups: {
                    directory: backupDir,
                    count: backupFiles.length,
                    recent: backupFiles,
                },
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
