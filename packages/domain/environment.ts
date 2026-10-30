// Classification only: target addresses, credentials, and authorization live elsewhere.
export type ExecutionEnvironment = Readonly<{
  kind: "web";
  deployment: "local" | "development" | "test" | "staging" | "production";
}>;
