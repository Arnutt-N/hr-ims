import { Queue, Worker, Job } from 'bullmq';
import { sendEmail } from '../services/emailService';
import { logError, logInfo } from '../utils/logger';
import { createQueueConnection } from '../utils/queueConnection';

// [2026-08-23] Modified by Cline: switched to shared queue connection factory;
// typing workaround centralized inside the factory itself (review #21/#22 followup)
const connection = createQueueConnection();

// Create the email queue
export const emailQueue = new Queue('email-queue', { connection: connection });

console.log('๐“ฌ Email Queue Initialized');

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
    { connection: connection, concurrency: 5 } // process up to 5 emails concurrently
);

emailWorker.on('completed', (job) => {
    logInfo(`Email job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
    logError(`Email job ${job?.id} failed`, err);
});
