export type DomainErrorCode =
  | "INVALID_VALUE"
  | "INVALID_TRANSITION"
  | "DUPLICATE_AGENT"
  | "AGENT_NOT_FOUND"
  | "EMPTY_SIMULATION"
  | "UNFINISHED_AGENTS";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export function nonBlank(value: string, field: string): string {
  if (value.trim().length === 0) {
    throw new DomainError("INVALID_VALUE", `${field} must not be blank.`);
  }
  return value;
}
