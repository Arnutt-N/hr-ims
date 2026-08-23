import { type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';

/**
 * Shared BullMQ/ioredis connection factory.
 *
 * [2026-08-23] Modified by Cline: Extracted the duplicated Redis connection
 * setup from queue modules (review followup for PR #21) - centralizes the
 * maxRetriesPerRequest: null option required by BullMQ Workers' blocking
 * commands so future queues cannot forget it.
 *
 * [2026-08-23] Modified by Cline: The double cast lives here in a single
 * place because bullmq bundles its own nested copy of ioredis typings, so
 * our IORedis instance does not structurally match bullmq's
 * ConnectionOptions even though it is compatible at runtime
 * (review #22 followup).
 */
export function createQueueConnection(): ConnectionOptions {
    return new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
    }) as unknown as ConnectionOptions;
}