CREATE TABLE `legal_compliance` (
	`id` text PRIMARY KEY NOT NULL,
	`research_id` text NOT NULL,
	`workflow_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`current_stage` text,
	`progress` integer DEFAULT 0,
	`results` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	`error_message` text,
	FOREIGN KEY (`research_id`) REFERENCES `research`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `legal_compliance_research_id_idx` ON `legal_compliance` (`research_id`);--> statement-breakpoint
CREATE INDEX `legal_compliance_status_idx` ON `legal_compliance` (`status`);--> statement-breakpoint
CREATE INDEX `legal_compliance_created_at_idx` ON `legal_compliance` (`created_at`);