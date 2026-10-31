export class ScopeViolationError extends Error {
  readonly attemptedUrl: string;

  constructor(message: string, attemptedUrl: string) {
    super(message);
    this.name = "ScopeViolationError";
    this.attemptedUrl = attemptedUrl;
  }
}

export function normalizeTargetUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    throw new ScopeViolationError("Target URL is missing or exceeds maximum length.", trimmed);
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ScopeViolationError("Target URL is not a valid URL.", trimmed);
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new ScopeViolationError("Target URL must use http or https protocol.", trimmed);
  }
  if (parsed.username || parsed.password) {
    throw new ScopeViolationError("Target URL must not contain credentials.", trimmed);
  }
  parsed.hash = "";
  return parsed.href;
}

export function isUrlInScope(candidate: string, targetBaseUrl: string): boolean {
  try {
    const base = new URL(normalizeTargetUrl(targetBaseUrl));
    const target = new URL(candidate, base);
    if (target.protocol !== base.protocol) return false;
    if (target.hostname !== base.hostname) return false;
    if (target.port !== base.port) return false;
    if (target.username || target.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function assertInScope(candidate: string, targetBaseUrl: string): string {
  const base = new URL(normalizeTargetUrl(targetBaseUrl));
  let resolved: URL;
  try {
    resolved = new URL(candidate, base);
  } catch {
    throw new ScopeViolationError(`Cannot resolve URL "${candidate}" against target.`, candidate);
  }
  if (!/^https?:$/i.test(resolved.protocol)) {
    throw new ScopeViolationError(`Disallowed protocol "${resolved.protocol}" for "${candidate}".`, candidate);
  }
  if (resolved.username || resolved.password) {
    throw new ScopeViolationError("Target URL must not contain credentials.", candidate);
  }
  if (resolved.origin !== base.origin) {
    throw new ScopeViolationError(
      `Navigation to origin "${resolved.origin}" is out of authorized target scope "${base.origin}".`,
      resolved.href,
    );
  }
  resolved.hash = "";
  return resolved.href;
}

export function isAllowedSubresource(url: string, targetBaseUrl: string): boolean {
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  return isUrlInScope(url, targetBaseUrl);
}
