/**
 * Type-safe API interfaces for B2B legal research API
 *
 * This file contains only TypeScript type definitions extracted from the API.
 * No runtime code is included, ensuring zero backend code leakage into frontend bundles.
 */

// Direct export of API types from source
// With extended-env.d.ts importing API's worker-configuration, Cloudflare types are available
export type { ApiType } from '../../apps/research-api/src/index';


/**
 * Usage in frontend:
 *
 * import type { ApiType } from '@b2beast/api-types';
 * import { hc } from 'hono/client';
 *
 * const client = hc<ApiType>('/api');
 */
