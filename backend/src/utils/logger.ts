import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { getLoggingSettings, isFeatureEnabled } from './settings';

/**
 * Logger Service
 * บันทึก Log การใช้งานระบบด้วย Winston
 */

let logger: winston.Logger | null = null;

/**
 * สร้าง Logger instance
 */
export async function createLogger(): Promise<winston.Logger> {
    const settings = await getLoggingSettings();

    const transports: winston.transport[] = [];

    // บันทึก Error แยกไฟล์
    if (settings.enabled) {
        transports.push(
            new DailyRotateFile({
                filename: 'logs/error-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                level: 'error',
                maxSize: '20m',
                maxFiles: `${settings.retentionDays}d`,
                zippedArchive: true,
            })
        );

        // บันทึกทุกระดับ
        transports.push(
            new DailyRotateFile({
                filename: 'logs/combined-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                maxSize: '20m',
                maxFiles: `${settings.retentionDays}d`,
                zippedArchive: true,
            })
        );
    }

    // แสดงใน Console ถ้าไม่ใช่ Production หรือถ้าเปิด Debug mode
    if (process.env.NODE_ENV !== 'production' || settings.level === 'debug') {
        transports.push(
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        );
    }

    return winston.createLogger({
        level: settings.level,
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
        defaultMeta: { service: 'hr-ims-api' },
        transports,
    });
}

/**
 * ดึง Logger instance
 */
export async function getLogger(): Promise<winston.Logger> {
    if (!logger) {
        logger = await createLogger();
    }
    return logger;
}

/**
 * รีเซ็ต Logger (ใช้เมื่อมีการอัปเดต Settings)
 */
export async function resetLogger(): Promise<void> {
    if (logger) {
        logger.close();
        logger = null;
    }
}

/**
 * บันทึก Log ทั่วไป
 */
export async function logInfo(message: string, meta?: any): Promise<void> {
    const enabled = await isFeatureEnabled('logging');
    if (!enabled) return;

    const log = await getLogger();
    log.info(message, meta);
}

/**
 * บันทึก Log Error
 */
export async function logError(message: string, error?: any): Promise<void> {
    const enabled = await isFeatureEnabled('logging');
    if (!enabled) return;

    const log = await getLogger();
    log.error(message, { error: error?.stack || error });
}

/**
 * บันทึก Log Warning
 */
export async function logWarn(message: string, meta?: any): Promise<void> {
    const enabled = await isFeatureEnabled('logging');
    if (!enabled) return;

    const log = await getLogger();
    log.warn(message, meta);
}

/**
 * บันทึก Log Debug
 */
export async function logDebug(message: string, meta?: any): Promise<void> {
    const enabled = await isFeatureEnabled('logging');
    if (!enabled) return;

    const log = await getLogger();
    log.debug(message, meta);
}

/**
 * ดึง Logs Directory
 */
export function getLogsDir(): string {
    return process.env.LOGS_PATH || './logs';
}
