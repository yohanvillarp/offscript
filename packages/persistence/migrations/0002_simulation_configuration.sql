CREATE TABLE `simulation_configurations` (
	`simulation_id` text PRIMARY KEY NOT NULL,
	`configuration` text NOT NULL,
	FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "configuration_json" CHECK(json_valid("simulation_configurations"."configuration") and json_type("simulation_configurations"."configuration") = 'object'),
	CONSTRAINT "configuration_identity" CHECK(json_type("simulation_configurations"."configuration", '$.simulationId') is 'text' and json_extract("simulation_configurations"."configuration", '$.simulationId') = "simulation_configurations"."simulation_id")
);
