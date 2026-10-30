export type PersistenceErrorCode = "INVALID_STORED_DATA" | "INVALID_WRITE" | "INCOMPATIBLE_SCHEMA" | "MIGRATION_FAILED";

export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;
  constructor(code: PersistenceErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PersistenceError";
    this.code = code;
  }
}
