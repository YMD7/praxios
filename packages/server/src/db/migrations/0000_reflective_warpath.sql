CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`proposal` text DEFAULT '{}',
	`target` text DEFAULT '{}',
	`requires_approval` integer DEFAULT true NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` integer NOT NULL,
	`executed_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`action_id` text NOT NULL,
	`proposal_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_id` text,
	`reviewed_at` integer,
	`comment` text,
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`proposal_id`) REFERENCES `proposals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `context_items` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`occurred_at` integer,
	`relevance_score` integer DEFAULT 0,
	`evidence` text DEFAULT '{}',
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `knowledge_links` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`wiki_page_id` text NOT NULL,
	`relation_type` text DEFAULT 'reference' NOT NULL,
	`evidence` text DEFAULT '{}',
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`wiki_page_id`) REFERENCES `wiki_pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `proposal_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_kind` text NOT NULL,
	`display_name` text NOT NULL,
	`schema` text DEFAULT '{}',
	`evidence_policy` text DEFAULT '{}',
	`approval_policy` text DEFAULT 'manual' NOT NULL,
	`apply_policy` text DEFAULT '{}',
	`targets` text DEFAULT '[]',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proposal_definitions_proposal_kind_unique` ON `proposal_definitions` (`proposal_kind`);--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`source_ids` text DEFAULT '[]',
	`task_id` text,
	`destination` text NOT NULL,
	`payload` text DEFAULT '{}',
	`evidence` text DEFAULT '[]',
	`rationale` text,
	`created_by` text DEFAULT 'user' NOT NULL,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	`reviewer_id` text,
	`review_comment` text,
	`applied_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `source_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`display_name` text NOT NULL,
	`provider` text NOT NULL,
	`owner` text,
	`extract_config` text DEFAULT '{}',
	`normalize_config` text DEFAULT '{}',
	`route_hints` text DEFAULT '{}',
	`allowed_proposal_kinds` text DEFAULT '[]',
	`defaults` text DEFAULT '{}',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_definitions_kind_unique` ON `source_definitions` (`kind`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_title` text,
	`source_url` text,
	`source_ref_id` text,
	`provider` text NOT NULL,
	`occurred_at` integer,
	`captured_at` integer NOT NULL,
	`hash` text NOT NULL,
	`metadata` text DEFAULT '{}',
	`content_preview` text,
	`storage_path` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'new' NOT NULL,
	`priority` text DEFAULT 'medium',
	`due_date` integer,
	`trigger_id` text,
	`completion_criteria` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`trigger_id`) REFERENCES `triggers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `triggers` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`summary` text NOT NULL,
	`detected_at` integer NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wiki_links` (
	`id` text PRIMARY KEY NOT NULL,
	`from_page_id` text NOT NULL,
	`to_page_id` text NOT NULL,
	`anchor_text` text,
	`status` text DEFAULT 'unresolved' NOT NULL,
	`source_id` text,
	`confidence` integer DEFAULT 100 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wiki_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
