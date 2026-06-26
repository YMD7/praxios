CREATE TABLE `context_items` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`source_id` text,
	`source_type` text NOT NULL,
	`title` text,
	`summary` text,
	`occurred_at` text,
	`relevance_score` real,
	`evidence` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `proposal_definitions` (
	`proposal_kind` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`approval_policy` text DEFAULT 'always' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`proposal_kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`source_ids` text DEFAULT '[]' NOT NULL,
	`task_id` text,
	`destination` text,
	`payload` text NOT NULL,
	`rationale` text,
	`created_by` text DEFAULT 'ai' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`reviewed_at` text,
	`reviewer_id` text,
	`review_comment` text,
	`applied_at` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `source_definitions` (
	`kind` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`provider` text,
	`allowed_proposal_kinds` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`source_type` text NOT NULL,
	`source_title` text,
	`source_url` text,
	`source_ref_id` text,
	`provider` text,
	`source_path` text NOT NULL,
	`hash` text NOT NULL,
	`occurred_at` text,
	`captured_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'new' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_date` text,
	`trigger_id` text,
	`completion_criteria` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wiki_links` (
	`id` text PRIMARY KEY NOT NULL,
	`from_page_id` text NOT NULL,
	`to_page_id` text NOT NULL,
	`anchor_text` text,
	`status` text NOT NULL,
	`source_id` text,
	`confidence` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wiki_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
