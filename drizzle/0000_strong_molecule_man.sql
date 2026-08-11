CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`store` text NOT NULL,
	`category` text NOT NULL,
	`price` real NOT NULL,
	`old_price` real NOT NULL,
	`coupon` text,
	`image_url` text NOT NULL,
	`affiliate_url` text NOT NULL,
	`badge` text,
	`verified_at` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_deals_active_updated` ON `deals` (`active`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_deals_category` ON `deals` (`category`);