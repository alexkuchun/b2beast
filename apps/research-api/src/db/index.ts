import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb(env: ResearchApiCloudflareBindings) {
	if (!env.DB) {
		throw new Error('DB not found');
	}
	return drizzle(env.DB, { schema });
}

export type DrizzleDb = ReturnType<typeof getDb>;
