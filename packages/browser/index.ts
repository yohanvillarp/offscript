export { BrowserManager, createBrowserManager } from "./browser-manager.ts";
export type { BrowserManagerOptions } from "./browser-manager.ts";
export { BrowserUserSession } from "./session.ts";
export {
  ScopeViolationError,
  assertInScope,
  isAllowedSubresource,
  isUrlInScope,
  normalizeTargetUrl,
} from "./scope-guard.ts";
export { capturePageSnapshot } from "./dom-snapshot.ts";
export { createBrowserTools } from "./tools/browser-tools.ts";
export type { BrowserToolAction, BrowserToolDefinition } from "./tools/browser-tools.ts";
export type {
  BrowserSessionOptions,
  ElementDescriptor,
  InteractionResult,
  PageSnapshot,
  ScreenshotResult,
} from "./types.ts";
