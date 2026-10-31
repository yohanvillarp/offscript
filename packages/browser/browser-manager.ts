import { chromium } from "playwright";
import type { Browser } from "playwright";
import { BrowserUserSession } from "./session.ts";
import type { BrowserSessionOptions } from "./types.ts";

export type BrowserManagerOptions = Readonly<{
  headless?: boolean | undefined;
}>;

export class BrowserManager {
  private browser: Browser | null = null;
  private pendingLaunch: Promise<Browser> | null = null;
  private readonly headless: boolean;
  private readonly sessions = new Set<BrowserUserSession>();
  private closed = false;

  constructor(options: BrowserManagerOptions = {}) {
    this.headless = options.headless ?? true;
  }

  private async ensureBrowser(): Promise<Browser> {
    if (this.closed) throw new Error("BrowserManager is closed.");
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }
    if (this.pendingLaunch) {
      return this.pendingLaunch;
    }
    this.pendingLaunch = (async () => {
      try {
        const browser = await chromium.launch({
          headless: this.headless,
          args: this.headless ? [] : ["--start-maximized"],
        });
        if (this.closed) {
          await browser.close().catch(() => {});
          throw new Error("BrowserManager was closed during launch.");
        }
        this.browser = browser;
        return browser;
      } catch (cause) {
        if (cause instanceof Error && cause.message.includes("Executable doesn't exist")) {
          throw new Error(
            "Chromium executable is not installed. Run 'npx playwright install chromium' before launching browser sessions.",
            { cause },
          );
        }
        throw cause;
      } finally {
        this.pendingLaunch = null;
      }
    })();
    return this.pendingLaunch;
  }

  async createSession(options: BrowserSessionOptions): Promise<BrowserUserSession> {
    if (this.closed) throw new Error("BrowserManager is closed.");
    const browser = await this.ensureBrowser();

    const contextOptions: Parameters<Browser["newContext"]>[0] = {};
    if (options.storageState) {
      contextOptions.storageState = options.storageState;
    }
    if (!this.headless) {
      contextOptions.viewport = null;
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

    if (this.pendingLaunch) {
      try {
        const browser = await this.pendingLaunch;
        await browser.close().catch(() => {});
      } catch {
        // Ignore launch error during close
      }
      this.pendingLaunch = null;
    }

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
