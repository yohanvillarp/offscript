import { chromium } from "playwright";
import type { Browser } from "playwright";
import { BrowserUserSession } from "./session.ts";
import type { BrowserSessionOptions } from "./types.ts";

export type BrowserManagerOptions = Readonly<{
  headless?: boolean | undefined;
}>;

export class BrowserManager {
  private browser: Browser | null = null;
  private readonly headless: boolean;
  private readonly sessions = new Set<BrowserUserSession>();
  private closed = false;

  constructor(options: BrowserManagerOptions = {}) {
    this.headless = options.headless ?? true;
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.closed) throw new Error("BrowserManager is closed.");
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: this.headless,
      });
    }
    return this.browser;
  }

  async createSession(options: BrowserSessionOptions): Promise<BrowserUserSession> {
    if (this.closed) throw new Error("BrowserManager is closed.");
    const browser = await this.ensureBrowser();

    const contextOptions: Parameters<Browser["newContext"]>[0] = {};
    if (options.storageState) {
      contextOptions.storageState = options.storageState;
    }

    const context = await browser.newContext(contextOptions);
    const session = await BrowserUserSession.create(context, options);
    this.sessions.add(session);
    return session;
  }

  async closeSession(session: BrowserUserSession): Promise<void> {
    this.sessions.delete(session);
    await session.close();
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    for (const session of this.sessions) {
      await session.close().catch(() => {});
    }
    this.sessions.clear();

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }

  isClosed(): boolean {
    return this.closed;
  }
}

export function createBrowserManager(options: BrowserManagerOptions = {}): BrowserManager {
  return new BrowserManager(options);
}
