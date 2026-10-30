CREATE TABLE `agents` (
	`simulation_id` text NOT NULL,
	`id` text NOT NULL,
	`position` integer NOT NULL,
	`profile` text NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	PRIMARY KEY(`simulation_id`, `id`),
	FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "agent_nonnegative_position" CHECK("agents"."position" >= 0),
	CONSTRAINT "agent_profile_json" CHECK(json_valid("agents"."profile")),
	CONSTRAINT "agent_status" CHECK("agents"."status" in ('ready','running','completed','failed','cancelled')),
	CONSTRAINT "agent_reason" CHECK(("agents"."status" = 'failed' and "agents"."reason" is not null and length(trim("agents"."reason")) > 0) or ("agents"."status" != 'failed' and "agents"."reason" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_position` ON `agents` (`simulation_id`,`position`);--> statement-breakpoint
CREATE TABLE `investigation_agents` (
	`investigation_id` text NOT NULL,
	`simulation_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`investigation_id`, `agent_id`),
	FOREIGN KEY (`investigation_id`,`simulation_id`) REFERENCES `investigations`(`id`,`simulation_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`simulation_id`,`agent_id`) REFERENCES `agents`(`simulation_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "investigation_agent_nonnegative_position" CHECK("investigation_agents"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `investigation_agent_position` ON `investigation_agents` (`investigation_id`,`position`);--> statement-breakpoint
CREATE TABLE `investigation_observations` (
	`investigation_id` text NOT NULL,
	`simulation_id` text NOT NULL,
	`observation_id` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`investigation_id`, `observation_id`),
	FOREIGN KEY (`investigation_id`,`simulation_id`) REFERENCES `investigations`(`id`,`simulation_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`observation_id`,`simulation_id`) REFERENCES `observations`(`id`,`simulation_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "investigation_observation_nonnegative_position" CHECK("investigation_observations"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `investigation_observation_position` ON `investigation_observations` (`investigation_id`,`position`);--> statement-breakpoint
CREATE TABLE `investigations` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_id` text NOT NULL,
	`requested_by` text NOT NULL,
	`hypothesis` text NOT NULL,
	`requested_at` text NOT NULL,
	`status` text NOT NULL,
	`assigned_at` text,
	`completed_at` text,
	`completed_by` text,
	`result` text,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`simulation_id`,`requested_by`) REFERENCES `agents`(`simulation_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`simulation_id`,`completed_by`) REFERENCES `agents`(`simulation_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "investigation_revision" CHECK("investigations"."revision" >= 0 and "investigations"."revision" <= 9007199254740991),
	CONSTRAINT "investigation_state" CHECK((
    ("investigations"."status" = 'requested' and "investigations"."assigned_at" is null and "investigations"."completed_at" is null and "investigations"."completed_by" is null and "investigations"."result" is null)
    or ("investigations"."status" = 'assigned' and "investigations"."assigned_at" is not null and "investigations"."completed_at" is null and "investigations"."completed_by" is null and "investigations"."result" is null)
    or ("investigations"."status" = 'completed' and "investigations"."assigned_at" is not null and "investigations"."completed_at" is not null and "investigations"."completed_by" is not null and "investigations"."result" is not null)
  )),
	CONSTRAINT "investigation_result_json" CHECK("investigations"."result" is null or json_valid("investigations"."result"))
);
--> statement-breakpoint
CREATE INDEX `investigation_simulation_status` ON `investigations` (`simulation_id`,`status`,`requested_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `investigation_scope` ON `investigations` (`id`,`simulation_id`);--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`simulation_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`observed_at` text NOT NULL,
	`description` text NOT NULL,
	`location` text NOT NULL,
	`evidence_ids` text NOT NULL,
	FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`simulation_id`,`agent_id`) REFERENCES `agents`(`simulation_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "observation_evidence_json" CHECK(json_valid("observations"."evidence_ids"))
);
--> statement-breakpoint
CREATE INDEX `observation_simulation_time` ON `observations` (`simulation_id`,`observed_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `observation_scope` ON `observations` (`id`,`simulation_id`);--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` text PRIMARY KEY NOT NULL,
	`environment` text NOT NULL,
	`deployment` text NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	CONSTRAINT "simulation_environment" CHECK("simulations"."environment" = 'web'),
	CONSTRAINT "simulation_deployment" CHECK("simulations"."deployment" in ('local','development','test','staging','production')),
	CONSTRAINT "simulation_status" CHECK("simulations"."status" in ('created','running','completed','failed','cancelled')),
	CONSTRAINT "simulation_reason" CHECK(("simulations"."status" = 'failed' and "simulations"."reason" is not null and length(trim("simulations"."reason")) > 0) or ("simulations"."status" != 'failed' and "simulations"."reason" is null))
);
