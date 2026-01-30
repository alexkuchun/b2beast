CREATE TABLE `research` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contract_name` text NOT NULL,
	`contract_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`current_stage` text,
	`results` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	`error_message` text
);
--> statement-breakpoint
CREATE INDEX `research_user_id_idx` ON `research` (`user_id`);--> statement-breakpoint
CREATE INDEX `research_status_idx` ON `research` (`status`);--> statement-breakpoint
CREATE INDEX `research_created_at_idx` ON `research` (`created_at`);