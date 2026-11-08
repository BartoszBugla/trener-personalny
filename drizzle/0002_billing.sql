CREATE TABLE `billing_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_plan_id` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`training_count` integer NOT NULL,
	`sms_sent_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_plan_id`) REFERENCES `client_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_periods_plan_start_idx` ON `billing_periods` (`client_plan_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `client_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`plan_type` text NOT NULL,
	`family_group_id` integer,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`family_group_id`) REFERENCES `family_groups`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `client_plans_user_id_idx` ON `client_plans` (`user_id`);--> statement-breakpoint
CREATE INDEX `client_plans_family_group_id_idx` ON `client_plans` (`family_group_id`);--> statement-breakpoint
CREATE TABLE `family_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `family_packages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_group_id` integer NOT NULL,
	`size` integer NOT NULL,
	`starts_on` text NOT NULL,
	`sms_sent_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`family_group_id`) REFERENCES `family_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `family_packages_group_id_idx` ON `family_packages` (`family_group_id`);