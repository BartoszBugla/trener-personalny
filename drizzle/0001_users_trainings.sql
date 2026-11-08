CREATE TABLE `user_aliases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`alias` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_aliases_alias_unique` ON `user_aliases` (`alias`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`email` text,
	`phone` text,
	`is_trainer` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `users_normalized_name_idx` ON `users` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `trainings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`trainer_id` integer NOT NULL,
	`client_id` integer,
	`client_assigned_manually` integer DEFAULT false NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`title` text NOT NULL,
	`client_name` text,
	`location` text,
	`notes` text,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`trainer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trainings_source_external_id_idx` ON `trainings` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `trainings_starts_at_idx` ON `trainings` (`starts_at`);--> statement-breakpoint
CREATE INDEX `trainings_trainer_id_idx` ON `trainings` (`trainer_id`);--> statement-breakpoint
CREATE INDEX `trainings_client_id_idx` ON `trainings` (`client_id`);