export type HostPhase = "starting" | "ready" | "failed" | "stopping" | "stopped";

const status = (values: readonly string[]) => ({
  type: "object", additionalProperties: false, required: ["status"],
  properties: { status: { type: "string", enum: values } },
});

export const errorSchema = {
  type: "object", additionalProperties: false, required: ["error"],
  properties: { error: { type: "string", enum: ["UNAUTHORIZED", "HOST_NOT_ALLOWED", "ORIGIN_NOT_ALLOWED", "NOT_FOUND", "INVALID_REQUEST", "INTERNAL_ERROR"] } },
};
const errors = { 400: errorSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema, 500: errorSchema };
export const healthSchemas = {
  live: { response: { ...errors, 200: status(["alive"]) } },
  ready: { response: { ...errors, 200: status(["ready"]), 503: status(["not-ready"]) } },
};
