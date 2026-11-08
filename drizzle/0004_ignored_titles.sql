CREATE TABLE `ignored_titles` (
	`normalized_title` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
