import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, desc, and, or } from 'drizzle-orm';
import { research, legalCompliance } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import type { DrizzleDb } from '../db';

const updateResearchSchema = z.object({
	contractName: z.string().min(1).max(255).optional(),
	contractKey: z.string().optional(),
	status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
	currentStage: z.string().optional(),
	results: z.string().optional(), // JSON string
	errorMessage: z.string().optional(),
});

const updateStatusSchema = z.object({
	status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
	currentStage: z.string().optional(),
	results: z.string().optional(), // JSON string
	errorMessage: z.string().optional(),
});

type AppType = {
	Bindings: ResearchApiCloudflareBindings;
	Variables: {
		db: DrizzleDb;
		userId: string | null;
	};
};

const createResearchSchema = z.object({
	contractName: z.string().min(1, 'Contract name is required').max(255),
	fileName: z.string().min(1, 'File name is required'),
	pdfBase64: z.string().min(1, 'PDF file data is required'),
	totalPages: z.number().int().positive('Total pages must be a positive integer'),
	locale: z.string().default('en'), // User's preferred language for AI-generated content
});

export const researchRoutes = new Hono<AppType>()
	// Create new research with base64 PDF and trigger workflow
	.post('/', requireAuth, zValidator('json', createResearchSchema), async (c) => {
		const db = c.get('db');
		const userId = c.get('userId')!;
		const { contractName, fileName, pdfBase64, totalPages, locale } = c.req.valid('json');

		console.log('[API] Creating research with locale:', locale);

		try {
			// Decode base64 to binary
			const binaryString = atob(pdfBase64);
			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}

			// Generate unique file key
			const contractKey = `contracts/${userId}/${crypto.randomUUID()}-${fileName}`;

			// Upload to R2
			const bucket = c.env.research_assets;
			await bucket.put(contractKey, bytes, {
				httpMetadata: {
					contentType: 'application/pdf',
				},
			});

			// Create research record with in_progress status
			const [newResearch] = await db
				.insert(research)
				.values({
					userId,
					contractName: contractName.trim(),
					contractKey,
					locale, // Store user's preferred language
					status: 'in_progress',
					currentStage: 'uploading',
					})
				.returning();

			// Trigger the PDF parsing workflow immediately
			const workflow = c.env.PDF_PARSER_WORKFLOW;
			const instance = await workflow.create({
				params: {
					contractKey,
					totalPages,
					researchId: newResearch.id,
					locale, // Pass user's preferred language to workflow
					},
			});

			// Update research record with workflow ID only
			// Let the workflow update the currentStage to avoid race conditions
			const [updatedResearch] = await db
				.update(research)
				.set({
					workflowId: instance.id,
					updatedAt: new Date(),
				})
				.where(eq(research.id, newResearch.id))
				.returning();

			return c.json({
				research: updatedResearch,
				workflowId: instance.id,
				message: 'Contract uploaded and analysis started'
			}, 201);
		} catch (error) {
			console.error('Error creating research:', error);
			return c.json({ error: 'Failed to create research' }, 500);
		}
	})

	// Get all research for current user
	.get('/', requireAuth, async (c) => {
		const db = c.get('db');
		const userId = c.get('userId')!;

		try {
			const researchList = await db
				.select()
				.from(research)
				.where(eq(research.userId, userId))
				.orderBy(desc(research.createdAt));

			return c.json({ research: researchList });
		} catch (error) {
			console.error('Error fetching research:', error);
			return c.json({ error: 'Failed to fetch research' }, 500);
		}
	})

	// Get single research by ID
	.get('/:id', requireAuth, async (c) => {
		const db = c.get('db');
		const userId = c.get('userId')!;
		const id = c.req.param('id');

		try {
			const [researchItem] = await db
				.select()
				.from(research)
				.where(and(eq(research.id, id), eq(research.userId, userId)));

			if (!researchItem) {
				return c.json({ error: 'Research not found' }, 404);
			}

			return c.json({ research: researchItem });
		} catch (error) {
			console.error('Error fetching research:', error);
			return c.json({ error: 'Failed to fetch research' }, 500);
		}
	})

	// Update research
	.patch('/:id', requireAuth, zValidator('json', updateResearchSchema), async (c) => {
		const db = c.get('db');
		const userId = c.get('userId')!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		try {
			// Verify ownership
			const [existing] = await db
				.select()
				.from(research)
				.where(and(eq(research.id, id), eq(research.userId, userId)));

			if (!existing) {
				return c.json({ error: 'Research not found' }, 404);
			}

			// Build update object
			const updateData: any = {
				updatedAt: new Date(),
			};

			if (data.contractName !== undefined) updateData.contractName = data.contractName;
			if (data.contractKey !== undefined) updateData.contractKey = data.contractKey;
			if (data.status !== undefined) updateData.status = data.status;
			if (data.currentStage !== undefined) updateData.currentStage = data.currentStage;
			if (data.results !== undefined) updateData.results = data.results;
			if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage;

			// Set completedAt when status changes to completed
			if (data.status === 'completed') {
				updateData.completedAt = new Date();
			}

			const [updated] = await db
				.update(research)
				.set(updateData)
				.where(and(eq(research.id, id), eq(research.userId, userId)))
				.returning();

			return c.json({ research: updated });
		} catch (error) {
			console.error('Error updating research:', error);
			return c.json({ error: 'Failed to update research' }, 500);
		}
	})

	// Update research status (convenience endpoint)
	.patch('/:id/status', requireAuth, zValidator('json', updateStatusSchema), async (c) => {
		const db = c.get('db');
		const userId = c.get('userId')!;
		const id = c.req.param('id');
		const data = c.req.valid('json');

		try {
			// Verify ownership
			const [existing] = await db
				.select()
				.from(research)
				.where(and(eq(research.id, id), eq(research.userId, userId)));

			if (!existing) {
				return c.json({ error: 'Research not found' }, 404);
			}

			const updateData: any = {
				status: data.status,
				updatedAt: new Date(),
			};

			if (data.currentStage !== undefined) updateData.currentStage = data.currentStage;
			if (data.results !== undefined) updateData.results = data.results;
			if (data.errorMessage !== undefined) updateData.errorMessage = data.errorMessage;

			// Set completedAt when status changes to completed
			if (data.status === 'completed') {
				updateData.completedAt = new Date();
			}

			const [updated] = await db
				.update(research)
				.set(updateData)
				.where(and(eq(research.id, id), eq(research.userId, userId)))
				.returning();

			return c.json({ research: updated });
		} catch (error) {
			console.error('Error updating research status:', error);
			return c.json({ error: 'Failed to update research status' }, 500);
		}
	})

	// Trigger legal compliance check on existing research
	.post('/:id/compliance-check', requireAuth, zValidator('json', z.object({
		locale: z.string().default('en'), // User's preferred language for compliance results
	})), async (c) => {
		const db = c.get('db');
		const userId = c.get('userId')!;
		const id = c.req.param('id');
		const { locale } = c.req.valid('json');

		console.log('[API] Triggering compliance check with locale:', locale);

		try {
			// Verify ownership and get research
			const [existing] = await db
				.select()
				.from(research)
				.where(and(eq(research.id, id), eq(research.userId, userId)));

			if (!existing) {
				return c.json({ error: 'Research not found' }, 404);
			}

			// Check if research has completed parsing
			if (existing.status !== 'completed' || !existing.results) {
				return c.json({ error: 'Research must be completed with results before compliance check' }, 400);
			}

			// Check if there's already an ongoing compliance check for this research
			const existingCompliance = await db
				.select()
				.from(legalCompliance)
				.where(
					and(
						eq(legalCompliance.researchId, id),
						or(
							eq(legalCompliance.status, 'pending'),
							eq(legalCompliance.status, 'in_progress')
						)
					)
				);

			if (existingCompliance.length > 0) {
				return c.json({
					error: 'A compliance check is already in progress for this research',
					existingCompliance: existingCompliance[0]
				}, 409);
			}

			// Parse the results to get contract blocks
			const parsedResults = JSON.parse(existing.results);
			const contractBlocks = parsedResults.blocks;

			if (!contractBlocks || contractBlocks.length === 0) {
				return c.json({ error: 'No contract blocks found in research results' }, 400);
			}

			// Create a legal_compliance record
			const [complianceRecord] = await db
				.insert(legalCompliance)
				.values({
					researchId: id,
					workflowId: '', // Will be updated after workflow creation
					status: 'pending',
					currentStage: null,
					progress: 0,
				})
				.returning();

			// Trigger the legal compliance workflow
			const workflow = c.env.LEGAL_COMPLIANCE_WORKFLOW;
			const instance = await workflow.create({
				params: {
					contractBlocks,
					complianceId: complianceRecord.id,
					researchId: existing.id,
					locale, // Pass user's preferred language to workflow
				},
			});

			// Update compliance record with workflow ID
			const [updatedCompliance] = await db
				.update(legalCompliance)
				.set({
					workflowId: instance.id,
					updatedAt: new Date(),
				})
				.where(eq(legalCompliance.id, complianceRecord.id))
				.returning();

			return c.json({
				compliance: updatedCompliance,
				complianceWorkflowId: instance.id,
				message: 'Legal compliance check started'
			});
		} catch (error) {
			console.error('Error starting compliance check:', error);
			return c.json({ error: 'Failed to start compliance check' }, 500);
		}
	})

	// Get legal compliance status for a research
	.get('/:id/compliance', requireAuth, async (c) => {
		const db = c.get('db');
		const userId = c.get('userId')!;
		const id = c.req.param('id');

		try {
			// Verify ownership of the research
			const [existing] = await db
				.select()
				.from(research)
				.where(and(eq(research.id, id), eq(research.userId, userId)));

			if (!existing) {
				return c.json({ error: 'Research not found' }, 404);
			}

			// Get all compliance checks for this research (ordered by most recent first)
			const complianceChecks = await db
				.select()
				.from(legalCompliance)
				.where(eq(legalCompliance.researchId, id))
				.orderBy(desc(legalCompliance.createdAt));

			return c.json({ compliance: complianceChecks });
		} catch (error) {
			console.error('Error fetching compliance status:', error);
			return c.json({ error: 'Failed to fetch compliance status' }, 500);
		}
	})

	// Delete research
	.delete('/:id', requireAuth, async (c) => {
		const db = c.get('db');
		const userId = c.get('userId')!;
		const id = c.req.param('id');

		try {
			// Verify ownership
			const [existing] = await db
				.select()
				.from(research)
				.where(and(eq(research.id, id), eq(research.userId, userId)));

			if (!existing) {
				return c.json({ error: 'Research not found' }, 404);
			}

			await db.delete(research).where(and(eq(research.id, id), eq(research.userId, userId)));

			return c.json({ success: true });
		} catch (error) {
			console.error('Error deleting research:', error);
			return c.json({ error: 'Failed to delete research' }, 500);
		}
	});
