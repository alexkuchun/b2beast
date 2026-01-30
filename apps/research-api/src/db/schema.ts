import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Research table for B2B contract legal research
 *
 * This table stores research data for uploaded contracts. Each research:
 * - Belongs to a specific user (via userId from Clerk)
 * - Tracks contract analysis stages
 * - Stores results including highlighted clauses and legal findings
 */
export const research = sqliteTable(
	'research',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// User identification (from Clerk)
		userId: text('user_id').notNull(),

		// Contract information
		contractName: text('contract_name').notNull(),
		contractKey: text('contract_key'), // R2 key path to the uploaded contract PDF
		title: text('title'), // AI-generated descriptive title in user's language (null until analysis completes)
		locale: text('locale'), // User's preferred language for title generation (en, ru, etc.)

		// Research status and stage
		status: text('status').notNull().default('pending'), // pending, in_progress, completed, failed
		currentStage: text('current_stage'), // Stage of research process (parsing, reviewing, completed)
		progress: integer('progress').default(0), // Progress percentage (0-100)
		workflowId: text('workflow_id'), // Cloudflare Workflow instance ID for tracking

		// Research results (stored as JSON)
		// Will contain: findings, highlighted clauses, severity levels (red/yellow/green), etc.
		results: text('results'), // JSON string containing research findings
		summary: text('summary'), // Summary of document analysis with overall evaluation and key issues

		// Metadata
		createdAt: integer('created_at', { mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp' }),

		// Error tracking
		errorMessage: text('error_message'),
	},
	(table) => ({
		userIdIdx: index('research_user_id_idx').on(table.userId),
		statusIdx: index('research_status_idx').on(table.status),
		createdAtIdx: index('research_created_at_idx').on(table.createdAt),
	})
);

export type Research = typeof research.$inferSelect;
export type InsertResearch = typeof research.$inferInsert;

/**
 * Legal Compliance table for tracking legal compliance checks
 *
 * This table stores legal compliance checks for research. Each compliance check:
 * - Belongs to a specific research record
 * - Has its own workflow and status tracking
 * - Can be run multiple times for the same research
 */
export const legalCompliance = sqliteTable(
	'legal_compliance',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Reference to the research this compliance check belongs to
		researchId: text('research_id')
			.notNull()
			.references(() => research.id, { onDelete: 'cascade' }),

		// Workflow tracking
		workflowId: text('workflow_id').notNull(), // Cloudflare Workflow instance ID

		// Status tracking
		status: text('status').notNull().default('pending'), // pending, in_progress, completed, failed
		currentStage: text('current_stage'), // compliance_check, identifying_articles, deep_analysis, compliance_completed, error
		progress: integer('progress').default(0), // Progress percentage (0-100)

		// Results (stored as JSON)
		// Will contain: phase1, phase2, summary
		results: text('results'), // JSON string containing compliance check results

		// Metadata
		createdAt: integer('created_at', { mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.$defaultFn(() => new Date())
			.notNull(),
		completedAt: integer('completed_at', { mode: 'timestamp' }),

		// Error tracking
		errorMessage: text('error_message'),
	},
	(table) => ({
		researchIdIdx: index('legal_compliance_research_id_idx').on(table.researchId),
		statusIdx: index('legal_compliance_status_idx').on(table.status),
		createdAtIdx: index('legal_compliance_created_at_idx').on(table.createdAt),
	})
);

export type LegalCompliance = typeof legalCompliance.$inferSelect;
export type InsertLegalCompliance = typeof legalCompliance.$inferInsert;
