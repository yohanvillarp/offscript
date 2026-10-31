import type { Browser } from "playwright";

export type BrowserSessionOptions = Readonly<{
  targetUrl: string;
  headless?: boolean | undefined;
  actionTimeoutMs?: number | undefined;
  navigationTimeoutMs?: number | undefined;
  storageState?: NonNullable<Parameters<Browser["newContext"]>[0]>["storageState"] | undefined;
}>;

export type ElementDescriptor = Readonly<{
  ref: string;
  role: string;
  name: string;
  tagName: string;
  text: string;
  disabled: boolean;
  type?: string | undefined;
  checked?: boolean | undefined;
  expanded?: boolean | undefined;
  placeholder?: string | undefined;
}>;

export type PageSnapshot = Readonly<{
  url: string;
  title: string;
  textSummary: string;
  elements: readonly ElementDescriptor[];
  snapshotEpoch: number;
  ariaSnapshot?: string | undefined;
}>;

export type InteractionResult = Readonly<{
  success: boolean;
  action: "navigate" | "click" | "type" | "inspect";
  url: string;
  error?: string | undefined;
}>;
