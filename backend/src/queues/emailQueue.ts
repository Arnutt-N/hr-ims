import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendEmail } from '../services/emailService';
import { logError, logInfo } from '../utils/logger';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create the email queue
export const emailQueue = new Queue('email-queue', { connection: connection as any });

console.log('📬 Email Queue Initialized');

interface EmailJobData {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

// Create the worker
export const emailWorker = new Worker(
    'email-queue',
    async (job: Job<EmailJobData>) => {
        const { to, subject, html, text } = job.data;
        const result = await sendEmail({ to, subject, html, text });
        if (!result) {
            throw new Error(`Failed to send email to ${to}`);
        }
        return result;
    },
    { connection: connection as any, concurrency: 5 } // process up to 5 emails concurrently
);

emailWorker.on('completed', (job) => {
    logInfo(`Email job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
    logError(`Email job ${job?.id} failed`, err);
});
