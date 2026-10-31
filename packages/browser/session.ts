import type { BrowserContext, Page } from "playwright";
import { assertInScope, isAllowedSubresource, isUrlInScope, normalizeTargetUrl } from "./scope-guard.ts";
import { capturePageSnapshot } from "./dom-snapshot.ts";
import type { BrowserSessionOptions, InteractionResult, PageSnapshot, ScreenshotResult } from "./types.ts";

export class BrowserUserSession {
  private readonly context: BrowserContext;
  private readonly page: Page;
  private readonly targetUrl: string;
  private readonly actionTimeoutMs: number;
  private readonly navigationTimeoutMs: number;
  private currentEpoch = 0;
  private closed = false;

  private constructor(
    context: BrowserContext,
    page: Page,
    targetUrl: string,
    actionTimeoutMs = 5000,
    navigationTimeoutMs = 10000,
  ) {
    this.context = context;
    this.page = page;
    this.targetUrl = targetUrl;
    this.actionTimeoutMs = actionTimeoutMs;
    this.navigationTimeoutMs = navigationTimeoutMs;
  }

  static async create(context: BrowserContext, options: BrowserSessionOptions): Promise<BrowserUserSession> {
    const targetUrl = normalizeTargetUrl(options.targetUrl);
    const actionTimeoutMs = options.actionTimeoutMs ?? 5000;
    const navigationTimeoutMs = options.navigationTimeoutMs ?? 10000;

    await context.route("**", (route) => {
      const requestUrl = route.request().url();
      if (!isAllowedSubresource(requestUrl, targetUrl)) {
        void route.abort("accessdenied");
        return;
      }
      void route.continue();
    });

    const page = await context.newPage();
    page.setDefaultTimeout(actionTimeoutMs);
    page.setDefaultNavigationTimeout(navigationTimeoutMs);

    return new BrowserUserSession(context, page, targetUrl, actionTimeoutMs, navigationTimeoutMs);
  }

  isClosed(): boolean {
    return this.closed;
  }

  getTargetUrl(): string {
    return this.targetUrl;
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  async navigate(url: string): Promise<InteractionResult> {
    if (this.closed) return { success: false, action: "navigate", url: this.getCurrentUrl(), error: "SESSION_CLOSED" };

    let resolvedUrl: string;
    try {
      resolvedUrl = assertInScope(url, this.targetUrl);
    } catch (error) {
      return {
        success: false,
        action: "navigate",
        url: this.getCurrentUrl(),
        error: error instanceof Error ? error.message : "TARGET_OUT_OF_SCOPE",
      };
    }

    this.currentEpoch++;
    try {
      await this.page.goto(resolvedUrl, {
        timeout: this.navigationTimeoutMs,
        waitUntil: "load",
      });
      // Allow client-side frameworks (e.g. Next.js, React) to settle initial hydration
      await this.page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50))).catch(() => {});
      return { success: true, action: "navigate", url: this.page.url() };
    } catch (cause) {
      return {
        success: false,
        action: "navigate",
        url: this.page.url(),
        error: cause instanceof Error ? cause.message : "NAVIGATION_FAILED",
      };
    }
  }

  async inspect(): Promise<PageSnapshot> {
    if (this.closed) throw new Error("Session is closed.");
    this.currentEpoch++;
    return await capturePageSnapshot(this.page, this.currentEpoch);
  }

  private resolveLocator(ref: string) {
    if (!/^elem_\d+$/.test(ref)) return null;
    return this.page.locator(`[data-offscript-ref="${ref}"][data-offscript-epoch="${this.currentEpoch}"]`);
  }

  async click(ref: string): Promise<InteractionResult> {
    if (this.closed) return { success: false, action: "click", url: this.getCurrentUrl(), error: "SESSION_CLOSED" };
    const locator = this.resolveLocator(ref);
    if (!locator) return { success: false, action: "click", url: this.getCurrentUrl(), error: "INVALID_ELEMENT_REF" };
    try {
      if ((await locator.count()) === 0) {
        return { success: false, action: "click", url: this.page.url(), error: "STALE_OR_MISSING_ELEMENT_REF" };
      }
      if (await locator.first().isDisabled().catch(() => false)) {
        return { success: false, action: "click", url: this.page.url(), error: "ELEMENT_IS_DISABLED" };
      }
      await locator.first().click({ timeout: this.actionTimeoutMs });
      const newUrl = this.page.url();
      if (!isUrlInScope(newUrl, this.targetUrl)) {
        return { success: false, action: "click", url: newUrl, error: `Navigation resulted in out-of-scope URL "${newUrl}".` };
      }
      return { success: true, action: "click", url: newUrl };
    } catch (cause) {
      return { success: false, action: "click", url: this.page.url(), error: cause instanceof Error ? cause.message : "CLICK_FAILED" };
    }
  }

  async type(ref: string, text: string): Promise<InteractionResult> {
    if (this.closed) return { success: false, action: "type", url: this.getCurrentUrl(), error: "SESSION_CLOSED" };
    const locator = this.resolveLocator(ref);
    if (!locator) return { success: false, action: "type", url: this.getCurrentUrl(), error: "INVALID_ELEMENT_REF" };
    try {
      if ((await locator.count()) === 0) {
        return { success: false, action: "type", url: this.page.url(), error: "STALE_OR_MISSING_ELEMENT_REF" };
      }
      if (await locator.first().isDisabled().catch(() => false)) {
        return { success: false, action: "type", url: this.page.url(), error: "ELEMENT_IS_DISABLED" };
      }
      await locator.first().fill(text, { timeout: this.actionTimeoutMs });
      return { success: true, action: "type", url: this.page.url() };
    } catch (cause) {
      return { success: false, action: "type", url: this.page.url(), error: cause instanceof Error ? cause.message : "TYPE_FAILED" };
    }
  }

  async scroll(direction: "up" | "down" = "down", ref?: string): Promise<InteractionResult> {
    if (this.closed) return { success: false, action: "scroll", url: this.getCurrentUrl(), error: "SESSION_CLOSED" };
    try {
      if (ref) {
        const locator = this.resolveLocator(ref);
        if (!locator) return { success: false, action: "scroll", url: this.getCurrentUrl(), error: "INVALID_ELEMENT_REF" };
        if ((await locator.count()) === 0) {
          return { success: false, action: "scroll", url: this.page.url(), error: "STALE_OR_MISSING_ELEMENT_REF" };
        }
        await locator.first().scrollIntoViewIfNeeded({ timeout: this.actionTimeoutMs });
      } else {
        const delta = direction === "up" ? -400 : 400;
        await this.page.evaluate((d) => window.scrollBy(0, d), delta);
      }
      return { success: true, action: "scroll", url: this.page.url() };
    } catch (cause) {
      return { success: false, action: "scroll", url: this.page.url(), error: cause instanceof Error ? cause.message : "SCROLL_FAILED" };
    }
  }

  async select(ref: string, value: string): Promise<InteractionResult> {
    if (this.closed) return { success: false, action: "select", url: this.getCurrentUrl(), error: "SESSION_CLOSED" };
    const locator = this.resolveLocator(ref);
    if (!locator) return { success: false, action: "select", url: this.getCurrentUrl(), error: "INVALID_ELEMENT_REF" };
    try {
      if ((await locator.count()) === 0) {
        return { success: false, action: "select", url: this.page.url(), error: "STALE_OR_MISSING_ELEMENT_REF" };
      }
      if (await locator.first().isDisabled().catch(() => false)) {
        return { success: false, action: "select", url: this.page.url(), error: "ELEMENT_IS_DISABLED" };
      }
      await locator.first().selectOption(value, { timeout: this.actionTimeoutMs });
      const newUrl = this.page.url();
      if (!isUrlInScope(newUrl, this.targetUrl)) {
        return { success: false, action: "select", url: newUrl, error: `Navigation resulted in out-of-scope URL "${newUrl}".` };
      }
      return { success: true, action: "select", url: newUrl };
    } catch (cause) {
      return { success: false, action: "select", url: this.page.url(), error: cause instanceof Error ? cause.message : "SELECT_FAILED" };
    }
  }

  /**
   * Captures the rendered viewport of the active in-scope page as a PNG image.
   * Password fields (<input type="password">) are rendered with native masking.
   * Universal optical redaction on arbitrary rendered text/canvas is not performed.
   */
  async screenshot(): Promise<ScreenshotResult> {
    if (this.closed) return { success: false, error: "SESSION_CLOSED" };
    try {
      const currentUrl = this.page.url();
      if (!isUrlInScope(currentUrl, this.targetUrl)) {
        return { success: false, error: `OUT_OF_SCOPE: Cannot capture screenshot from "${currentUrl}".` };
      }
      const data = await this.page.screenshot({ type: "png" });
      return { success: true, data, mimeType: "image/png" };
    } catch (cause) {
      return { success: false, error: cause instanceof Error ? cause.message : "SCREENSHOT_FAILED" };
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.context.close();
    } catch {
      // Ignore errors on closing already terminated contexts
    }
  }
}
