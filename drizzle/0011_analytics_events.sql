CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`visitor_id` text NOT NULL,
	`session_id` text NOT NULL,
	`entry` integer DEFAULT false NOT NULL,
	`path` text DEFAULT '' NOT NULL,
	`product_handle` text,
	`source` text,
	`referrer` text,
	`campaign` text,
	`device` text,
	`country` text,
	`city` text,
	`order_number` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_created_idx` ON `events` (`created_at`);--> statement-breakpoint
CREATE INDEX `events_type_created_idx` ON `events` (`type`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_session_idx` ON `events` (`session_id`);