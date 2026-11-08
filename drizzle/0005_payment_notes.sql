CREATE TABLE `billing_payment_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_plan_id` integer NOT NULL,
	`period_starts_at` integer NOT NULL,
	`note` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`client_plan_id`) REFERENCES `client_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_payment_notes_plan_start_idx` ON `billing_payment_notes` (`client_plan_id`,`period_starts_at`);--> statement-breakpoint
ALTER TABLE `family_packages` ADD `payment_note` text;