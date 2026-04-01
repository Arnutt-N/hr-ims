import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { execFile } from 'child_process';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import prisma from '../utils/prisma';
import { getBackupSettings } from '../utils/settings';
import { logInfo, logError } from '../utils/logger';

export interface BackupResult {
    success: boolean;
    path: string;
    filename: string;
    size: number;
    timestamp: Date;
    error?: string;
}

export interface RestoreResult {
    success: boolean;
    status: 'success' | 'invalid_path' | 'not_found' | 'failed';
    restoredPath?: string;
    databasePath?: string;
    uploadsRestored?: boolean;
    error?: string;
}

const execFileAsync = promisify(execFile);
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const DATABASE_PATH = path.join(BACKEND_ROOT, 'prisma', 'dev.db');

function resolveStoragePath(storagePath: string): string {
    return path.isAbsolute(storagePath) ? storagePath : path.resolve(BACKEND_ROOT, storagePath);
}

async function ensureStoragePath(storagePath: string): Promise<void> {
    await fs.mkdir(storagePath, { recursive: true });
}

function toPowerShellLiteral(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function createBackup(): Promise<BackupResult> {
    const settings = await getBackupSettings();

    if (!settings.enabled) {
        return {
            success: false,
            path: '',
            filename: '',
            size: 0,
            timestamp: new Date(),
            error: 'Backup is disabled'
        };
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.zip`;
        const storagePath = resolveStoragePath(settings.storagePath);
        const backupPath = path.join(storagePath, filename);

        await fs.mkdir(storagePath, { recursive: true });

        const output = createWriteStream(backupPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        let hasUploads = false;
        if (settings.includeUploads) {
            try {
                await fs.access(path.join(BACKEND_ROOT, 'uploads'));
                hasUploads = true;
            } catch {
                hasUploads = false;
            }
        }

        await new Promise<void>((resolve, reject) => {
            output.on('close', () => resolve());
            output.on('error', reject);
            archive.on('error', reject);

            archive.pipe(output);
            archive.file(DATABASE_PATH, { name: 'database.db' });

            if (hasUploads) {
                archive.directory(path.join(BACKEND_ROOT, 'uploads'), 'uploads');
            }

            archive.finalize();
        });

        const stats = await fs.stat(backupPath);

        await logInfo('Backup created successfully', {
            filename,
            size: stats.size,
            path: backupPath
        });

        await prisma.settings.updateMany({
            data: {
                lastBackupAt: new Date(),
                lastBackupStatus: 'success',
                lastBackupPath: backupPath
            }
        });

        await cleanupOldBackups();

        return {
            success: true,
            path: backupPath,
            filename,
            size: stats.size,
            timestamp: new Date()
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await logError('Backup failed', error);
        await prisma.settings.updateMany({
            data: {
                lastBackupAt: new Date(),
                lastBackupStatus: 'failed'
            }
        });

        return {
            success: false,
            path: '',
            filename: '',
            size: 0,
            timestamp: new Date(),
            error: errorMessage
        };
    }
}

export async function cleanupOldBackups(): Promise<void> {
    const settings = await getBackupSettings();
    const storagePath = resolveStoragePath(settings.storagePath);

    try {
        await ensureStoragePath(storagePath);
        const files = await fs.readdir(storagePath);
        const backups = files
            .filter((file) => file.startsWith('backup-') && file.endsWith('.zip'))
            .map((file) => ({
                name: file,
                path: path.join(storagePath, file)
            }));

        const sortedBackups = await Promise.all(
            backups.map(async (backup) => ({
                ...backup,
                time: (await fs.stat(backup.path)).mtime
            }))
        );

        sortedBackups.sort((a, b) => b.time.getTime() - a.time.getTime());

        const toDelete = sortedBackups.slice(settings.retentionCount);
        for (const backup of toDelete) {
            await fs.unlink(backup.path);
            await logInfo('Old backup deleted', { filename: backup.name });
        }
    } catch (error) {
        await logError('Failed to cleanup old backups', error);
    }
}

export async function listBackups(): Promise<Array<{
    filename: string;
    path: string;
    size: number;
    createdAt: Date;
}>> {
    const settings = await getBackupSettings();
    const storagePath = resolveStoragePath(settings.storagePath);

    try {
        await ensureStoragePath(storagePath);
        const files = await fs.readdir(storagePath);
        const backups = files
            .filter((file) => file.startsWith('backup-') && file.endsWith('.zip'))
            .map(async (file) => {
                const filePath = path.join(storagePath, file);
                const stats = await fs.stat(filePath);

                return {
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    createdAt: stats.mtime
                };
            });

        return await Promise.all(backups);
    } catch (error) {
        await logError('Failed to list backups', error);
        return [];
    }
}

export async function restoreBackup(backupPath: string): Promise<RestoreResult> {
    try {
        await fs.access(backupPath);
    } catch {
        return {
            success: false,
            status: 'not_found',
            restoredPath: backupPath,
            error: 'Backup file not found'
        };
    }

    const tempDir = path.join(path.dirname(backupPath), `.restore-${Date.now()}`);
    const backupDatabasePath = `${DATABASE_PATH}.restore-backup`;

    try {
        await fs.mkdir(tempDir, { recursive: true });
        await execFileAsync(
            'powershell.exe',
            [
                '-NoProfile',
                '-Command',
                `Expand-Archive -LiteralPath ${toPowerShellLiteral(backupPath)} -DestinationPath ${toPowerShellLiteral(tempDir)} -Force`
            ],
            { windowsHide: true }
        );

        const extractedDatabase = path.join(tempDir, 'database.db');
        try {
            await fs.access(extractedDatabase);
        } catch {
            return {
                success: false,
                status: 'failed',
                restoredPath: backupPath,
                error: 'Backup archive is missing database.db'
            };
        }

        const extractedUploads = path.join(tempDir, 'uploads');
        const uploadsRestored = await pathExists(extractedUploads);
        const uploadsTarget = path.join(BACKEND_ROOT, 'uploads');

        await prisma.$disconnect();

        try {
            if (await pathExists(DATABASE_PATH)) {
                await fs.copyFile(DATABASE_PATH, backupDatabasePath);
            }

            await fs.copyFile(extractedDatabase, DATABASE_PATH);

            if (uploadsRestored) {
                await fs.rm(uploadsTarget, { recursive: true, force: true });
                await fs.cp(extractedUploads, uploadsTarget, { recursive: true });
            }

            await prisma.$connect();
        } catch (restoreError) {
            if (await pathExists(backupDatabasePath)) {
                try {
                    await fs.copyFile(backupDatabasePath, DATABASE_PATH);
                } catch {
                    // Ignore rollback failure.
                }
            }

            await prisma.$connect().catch(() => undefined);
            throw restoreError;
        } finally {
            await fs.unlink(backupDatabasePath).catch(() => undefined);
        }

        await logInfo('Backup restored successfully', {
            path: backupPath,
            uploadsRestored
        });

        return {
            success: true,
            status: 'success',
            restoredPath: backupPath,
            databasePath: DATABASE_PATH,
            uploadsRestored
        };
    } catch (error) {
        await logError('Restore failed', error);
        return {
            success: false,
            status: 'failed',
            restoredPath: backupPath,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
}

export async function shouldBackup(): Promise<boolean> {
    const settings = await getBackupSettings();

    if (!settings.enabled) {
        return false;
    }

    const lastBackup = await prisma.settings.findFirst({
        select: { lastBackupAt: true }
    });

    if (!lastBackup?.lastBackupAt) {
        return true;
    }

    const hoursSinceLastBackup = (Date.now() - lastBackup.lastBackupAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastBackup >= 24;
}
