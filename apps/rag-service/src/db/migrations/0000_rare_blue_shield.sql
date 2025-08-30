CREATE TABLE `knowledge` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`user_id` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`knowledge_type` enum('text','file') NOT NULL DEFAULT 'text',
	`tags` json NOT NULL DEFAULT ('[]'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_chunks` (
	`id` varchar(36) NOT NULL DEFAULT (UUID()),
	`knowledge_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`chunk_index` varchar(10) NOT NULL,
	`embedding` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `knowledge_chunks` ADD CONSTRAINT `knowledge_chunks_knowledge_id_knowledge_id_fk` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge`(`id`) ON DELETE cascade ON UPDATE no action;