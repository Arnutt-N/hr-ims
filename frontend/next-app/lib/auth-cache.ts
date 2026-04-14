import 'server-only';

import { cache } from 'react';
import { auth } from '@/auth';

export const getCachedAuth = cache(async () => auth());
