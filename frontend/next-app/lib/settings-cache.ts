import 'server-only';

import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';

export const SETTINGS_CACHE_TAG = 'settings';
const SETTINGS_CACHE_KEY = ['settings-singleton'];
const SETTINGS_CACHE_TTL_SECONDS = 60 * 60;

export const getCachedSettings = unstable_cache(
    async () => prisma.settings.findFirst(),
    SETTINGS_CACHE_KEY,
    {
        tags: [SETTINGS_CACHE_TAG],
        revalidate: SETTINGS_CACHE_TTL_SECONDS,
    }
);
