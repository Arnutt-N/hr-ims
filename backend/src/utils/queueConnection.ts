import IORedis from 'ioredis';

/**
 * Shared BullMQ/ioredis connection factory.
 *
 * [2026-08-23] Modified by Cline: Extracted the duplicated Redis connection
 * setup from queue modules (review followup for PR #21) - centralizes the
 * maxRetriesPerRequest: null option required by BullMQ Workers' blocking
 * commands so future queues cannot forget it.
 */
export function createQueueConnection(): IORedis {
    return new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
    });
}

