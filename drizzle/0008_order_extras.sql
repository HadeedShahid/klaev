CREATE TABLE `checkouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`name` text,
	`email` text,
	`phone` text NOT NULL,
	`city` text,
	`address` text,
	`lines` text NOT NULL,
	`subtotal` integer NOT NULL,
	`order_id` integer,
	`contacted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkouts_token_unique` ON `checkouts` (`token`);--> statement-breakpoint
CREATE INDEX `checkouts_phone_idx` ON `checkouts` (`phone`);--> statement-breakpoint
CREATE INDEX `checkouts_updated_idx` ON `checkouts` (`updated_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_status` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_status_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `exchange_of` integer REFERENCES orders(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `orders` ADD `return_variant_id` integer REFERENCES variants(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `orders` ADD `returned_at` integer;