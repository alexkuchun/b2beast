import { Context, Next } from 'hono';
import type { DrizzleDb } from '../db';

/**
 * Auth middleware to extract user ID from request
 *
 * In production, this would validate Clerk JWT tokens and extract user ID.
 * For now, it expects a userId header for testing/development.
 */
export async function authMiddleware(
	c: Context<{
		Bindings: ResearchApiCloudflareBindings;
		Variables: {
			db: DrizzleDb;
			userId: string | null;
		};
	}>,
	next: Next
) {
	// TODO: In production, validate Clerk JWT token from Authorization header
	// For now, accept userId from header for development
	const userId = c.req.header('x-user-id');

	c.set('userId', userId || null);
	await next();
}

/**
 * Middleware to require authentication
 * Returns 401 if no userId is present
 */
export async function requireAuth(
	c: Context<{
		Bindings: ResearchApiCloudflareBindings;
		Variables: {
			db: DrizzleDb;
			userId: string | null;
		};
	}>,
	next: Next
) {
	const userId = c.get('userId');

	if (!userId) {
		return c.json({ error: 'Unauthorized - userId required' }, 401);
	}

	await next();
}
