import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getDb } from './db';
import { authMiddleware } from './middleware/auth';
import { researchRoutes } from './routes/research';
import { contractsRoutes } from './routes/contracts';
import type { DrizzleDb } from './db';

const app = new Hono<{
	Bindings: ResearchApiCloudflareBindings;
	Variables: {
		db: DrizzleDb;
		userId: string | null;
	};
}>()
	// CORS middleware
	.use('*', async (c, next) => {
		const corsOrigins = c.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

		return cors({
			origin: corsOrigins,
			allowHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
			allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			credentials: true,
		})(c, next);
	})

	// Database middleware
	.use('*', async (c, next) => {
		const db = getDb(c.env);
		c.set('db', db);
		return next();
	})

	// Auth middleware
	.use('*', authMiddleware)

	// Health check
	.get('/health', (c) => {
		return c.json({ status: 'ok', service: 'research-api' });
	})

	// Mount research routes
	.route('/research', researchRoutes)

	// Mount contracts routes
	.route('/contracts', contractsRoutes);

// Export for RPC client type inference
export type ApiType = typeof app;

// Export workflows
export { PdfParserWorkflow } from './workflows/pdf-parser';
export { LegalComplianceWorkflow } from './workflows/legal-compliance';
export { PythonExecutorContainer } from './containers/python-executor';

export default app;
