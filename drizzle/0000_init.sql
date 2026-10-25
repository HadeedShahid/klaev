CREATE TABLE `collections` (
	`handle` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`email` text,
	`phone` text,
	`accepts_marketing` integer DEFAULT false NOT NULL,
	`address1` text,
	`address2` text,
	`city` text,
	`province` text,
	`postal_code` text,
	`country` text DEFAULT 'PK' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`note` text,
	`shopify_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_shopifyId_unique` ON `customers` (`shopify_id`);--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`phone`);--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`variant_id` integer,
	`title` text NOT NULL,
	`size` text,
	`sku` text,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`cost_price` integer,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "order_lines_quantity_check" CHECK("order_lines"."quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX `order_lines_order_idx` ON `order_lines` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_lines_variant_idx` ON `order_lines` (`variant_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` integer NOT NULL,
	`customer_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address1` text,
	`address2` text,
	`city` text,
	`province` text,
	`postal_code` text,
	`country` text DEFAULT 'PK' NOT NULL,
	`subtotal` integer NOT NULL,
	`discount_code` text,
	`discount_total` integer DEFAULT 0 NOT NULL,
	`delivery_fee` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`advance` integer DEFAULT 0 NOT NULL,
	`courier_fee` integer,
	`tracking_number` text,
	`note` text,
	`source` text DEFAULT 'web' NOT NULL,
	`shopify_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`confirmed_at` integer,
	`shipped_at` integer,
	`delivered_at` integer,
	`cancelled_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_unique` ON `orders` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_shopifyId_unique` ON `orders` (`shopify_id`);--> statement-breakpoint
CREATE INDEX `orders_customer_idx` ON `orders` (`customer_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`method` text NOT NULL,
	`amount` integer NOT NULL,
	`reference` text,
	`note` text,
	`received_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payments_order_idx` ON `payments` (`order_id`);--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`src` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`alt` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`handle` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`collection_handle` text NOT NULL,
	`price` integer NOT NULL,
	`compare_at_price` integer,
	`colour` text,
	`tagline` text,
	`intro` text DEFAULT '[]' NOT NULL,
	`sections` text DEFAULT '[]' NOT NULL,
	`size_guide` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`position` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`collection_handle`) REFERENCES `collections`(`handle`) ON UPDATE cascade ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_handle_unique` ON `products` (`handle`);--> statement-breakpoint
CREATE INDEX `products_collection_idx` ON `products` (`collection_handle`);--> statement-breakpoint
CREATE TABLE `variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`sku` text NOT NULL,
	`size` text,
	`colour` text,
	`position` integer DEFAULT 0 NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`cost_price` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "variants_stock_check" CHECK("variants"."stock" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variants_sku_unique` ON `variants` (`sku`);--> statement-breakpoint
CREATE INDEX `variants_product_idx` ON `variants` (`product_id`);