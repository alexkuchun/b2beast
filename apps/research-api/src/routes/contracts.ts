import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { DrizzleDb } from '../db';

type AppType = {
	Bindings: ResearchApiCloudflareBindings;
	Variables: {
		db: DrizzleDb;
		userId: string | null;
	};
};

export const contractsRoutes = new Hono<AppType>()
	// List all contracts in R2 bucket
	.get('/', requireAuth, async (c) => {
		try {
			const bucket = c.env.research_assets;

			// List all objects in the R2 bucket
			const listed = await bucket.list();

			// Map to return only name and upload timestamp
			const contracts = listed.objects.map((obj) => ({
				name: obj.key,
				uploadedAt: obj.uploaded.toISOString(),
			}));

			return c.json({
				contracts,
				count: contracts.length,
				truncated: listed.truncated,
			});
		} catch (error) {
			console.error('Error listing contracts from R2:', error);
			return c.json({ error: 'Failed to list contracts' }, 500);
		}
	});
