import { Hono } from 'hono';
import type { DrizzleDb } from '../db';

type AppType = {
	Bindings: ResearchApiCloudflareBindings;
	Variables: {
		db: DrizzleDb;
		userId: string | null;
	};
};

export const containerRoutes = new Hono<AppType>()
	// Test Python container health endpoint
	.get('/health', async (c) => {
		try {
			// Get a container instance by name
			const container = c.env.PYTHON_EXECUTOR.getByName('test-instance');

			// Make a request to the container's health endpoint
			const response = await container.fetch(new Request('http://container/health'));
			const data = await response.json();

			return c.json({
				success: true,
				message: 'Python container is working!',
				containerResponse: data,
			});
		} catch (error) {
			return c.json(
				{
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				500
			);
		}
	})

	// Test Python code execution
	.post('/execute', async (c) => {
		try {
			const body = await c.req.json();
			const { code } = body;

			if (!code) {
				return c.json({ success: false, error: 'Code is required' }, 400);
			}

			// Get a container instance
			const container = c.env.PYTHON_EXECUTOR.getByName('executor-instance');

			// Execute Python code
			const response = await container.fetch(
				new Request('http://container/execute', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code }),
				})
			);

			const result = await response.json();
			return c.json(result);
		} catch (error) {
			return c.json(
				{
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				},
				500
			);
		}
	});
