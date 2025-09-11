CREATE TABLE `knowledge` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`user_id` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`knowledge_type` enum('text','file') NOT NULL DEFAULT 'text',
	`tags` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_chunks` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`knowledge_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`chunk_index` varchar(10) NOT NULL,
	`embedding` VECTOR(1536) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(255) NOT NULL,
	`email` varchar(255),
	`name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `knowledge` ADD CONSTRAINT `knowledge_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_knowledge_id_knowledge_id_fk` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge`(`id`) ON DELETE cascade ON UPDATE no action;