CREATE TABLE `event_outbox` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`simulation_id` text NOT NULL,
	`investigation_id` text NOT NULL,
	`revision` integer NOT NULL,
	`event_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`accepted_at` integer,
	`last_error` text,
	FOREIGN KEY (`investigation_id`,`simulation_id`) REFERENCES `investigations`(`id`,`simulation_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "outbox_json" CHECK(json_valid("event_outbox"."event_json")),
	CONSTRAINT "outbox_numbers" CHECK("event_outbox"."revision" >= 0 and "event_outbox"."attempts" >= 0 and "event_outbox"."available_at" >= 0),
	CONSTRAINT "outbox_status" CHECK("event_outbox"."status" in ('pending','leased','accepted','failed')),
	CONSTRAINT "outbox_lease" CHECK(("event_outbox"."status" = 'leased' and "event_outbox"."lease_token" is not null and "event_outbox"."lease_until" is not null) or ("event_outbox"."status" != 'leased' and "event_outbox"."lease_token" is null and "event_outbox"."lease_until" is null)),
	CONSTRAINT "outbox_acceptance" CHECK(("event_outbox"."status" = 'accepted' and "event_outbox"."accepted_at" is not null) or ("event_outbox"."status" != 'accepted' and "event_outbox"."accepted_at" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_outbox_event_id_unique` ON `event_outbox` (`event_id`);--> statement-breakpoint
CREATE INDEX `outbox_ready` ON `event_outbox` (`status`,`available_at`,`sequence`);--> statement-breakpoint
CREATE INDEX `outbox_aggregate_order` ON `event_outbox` (`investigation_id`,`sequence`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_investigation_revision` ON `event_outbox` (`investigation_id`,`revision`);