export type ApplicationErrorCode =
  | "SIMULATION_NOT_FOUND"
  | "SIMULATION_NOT_RUNNING"
  | "REQUESTER_NOT_FOUND"
  | "REQUESTER_NOT_RUNNING"
  | "OBSERVATION_NOT_FOUND"
  | "INVALID_REFERENCE"
  | "INVESTIGATION_ALREADY_EXISTS"
  | "INVESTIGATION_NOT_FOUND"
  | "INVESTIGATION_CONFLICT"
  | "ASSIGNEE_NOT_FOUND"
  | "ASSIGNEE_NOT_RUNNING"
  | "ASSIGNER_NOT_FOUND"
  | "ASSIGNER_NOT_RUNNING"
  | "READ_FAILED"
  | "SAVE_FAILED";

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApplicationError";
    this.code = code;
  }
}
