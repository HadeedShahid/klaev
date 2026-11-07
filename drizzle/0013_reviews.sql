CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`order_id` integer,
	`order_line_id` integer,
	`rating` integer NOT NULL,
	`body` text,
	`name` text NOT NULL,
	`city` text,
	`size` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`source` text DEFAULT 'site' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`reply` text,
	`photo_src` text,
	`photo_width` integer,
	`photo_height` integer,
	`screenshot_src` text,
	`screenshot_width` integer,
	`screenshot_height` integer,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`order_line_id`) REFERENCES `order_lines`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "reviews_rating_check" CHECK("reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_orderLineId_unique` ON `reviews` (`order_line_id`);--> statement-breakpoint
CREATE INDEX `reviews_product_status_idx` ON `reviews` (`product_id`,`status`);--> statement-breakpoint
CREATE INDEX `reviews_order_idx` ON `reviews` (`order_id`);--> statement-breakpoint
ALTER TABLE `orders` ADD `review_asked_at` integer;