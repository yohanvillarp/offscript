export class ContractValidationError extends Error {
  readonly path: string;

  constructor(path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = "ContractValidationError";
    this.path = path;
  }
}
