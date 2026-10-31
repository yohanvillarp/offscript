import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBrowserManager } from "../browser-manager.ts";
import type { BrowserManager } from "../browser-manager.ts";
import { startTestServer } from "./test-server.ts";
import type { TestServerHandle } from "./test-server.ts";

describe("browser session and lifecycle", () => {
  let server: TestServerHandle;
  let manager: BrowserManager;

  before(async () => {
    server = await startTestServer();
    manager = createBrowserManager({ headless: true });
  });

  after(async () => {
    await manager.close();
    await server.close();
  });

  it("navigates within scope and rejects out-of-scope URLs", async () => {
    const session = await manager.createSession({ targetUrl: server.origin });
    try {
      const navResult = await session.navigate("/");
      assert.equal(navResult.success, true);
      assert.equal(navResult.action, "navigate");
      assert.match(session.getCurrentUrl(), new RegExp(`^${server.origin}/?`));

      const outOfScope = await session.navigate("http://evil-external-site.com");
      assert.equal(outOfScope.success, false);
      assert.match(outOfScope.error || "", /out of authorized target scope/);
    } finally {
      await session.close();
    }
  });

  it("captures semantic snapshot with opaque element references and sanitizes passwords", async () => {
    const session = await manager.createSession({ targetUrl: server.origin });
    try {
      await session.navigate("/");
      const snapshot = await session.inspect();

      assert.equal(snapshot.title, "Explore Shop");
      assert.match(snapshot.textSummary, /Shop Home/);
      assert.ok(snapshot.elements.length >= 4);

      // Verify opaque references format
      for (const el of snapshot.elements) {
        assert.match(el.ref, /^elem_\d+$/);
      }

      // Check disabled button
      const disabledEl = snapshot.elements.find((el) => el.name.includes("Out of stock") || el.text.includes("Out of stock"));
      assert.ok(disabledEl);
      assert.equal(disabledEl.disabled, true);

      // Check password input is sanitized: password value must never appear in snapshot
      const passwordEl = snapshot.elements.find((el) => el.type === "password");
      assert.ok(passwordEl);
      assert.equal(passwordEl.text, "");
      assert.ok(!JSON.stringify(snapshot).includes("supersecret"));
    } finally {
      await session.close();
    }
  });

  it("performs bounded click and type interactions with opaque references", async () => {
    const session = await manager.createSession({ targetUrl: server.origin });
    try {
      await session.navigate("/");
      let snapshot = await session.inspect();

      // Click "Add Product" button
      const addBtn = snapshot.elements.find((el) => el.text.includes("Add Product") || el.name.includes("Add Product"));
      assert.ok(addBtn);

      const clickResult = await session.click(addBtn.ref);
      assert.equal(clickResult.success, true);

      // Verify effect on page
      snapshot = await session.inspect();
      assert.match(snapshot.textSummary, /Product Added/);

      // Type in input
      const inputEl = snapshot.elements.find((el) => el.role === "textbox" && el.type === "text");
      assert.ok(inputEl);
      const typeResult = await session.type(inputEl.ref, "wireless mouse");
      assert.equal(typeResult.success, true);

      // Disabled button reject
      const disabledBtn = snapshot.elements.find((el) => el.disabled);
      assert.ok(disabledBtn);
      const disabledClick = await session.click(disabledBtn.ref);
      assert.equal(disabledClick.success, false);
      assert.equal(disabledClick.error, "ELEMENT_IS_DISABLED");
    } finally {
      await session.close();
    }
  });

  it("performs scroll and select interactions on web pages", async () => {
    const session = await manager.createSession({ targetUrl: server.origin });
    try {
      await session.navigate("/");
      const snapshot = await session.inspect();

      // Test select
      const selectEl = snapshot.elements.find((el) => el.role === "combobox" || el.name.includes("Shipping"));
      assert.ok(selectEl);
      const selectResult = await session.select(selectEl.ref, "express");
      assert.equal(selectResult.success, true);
      assert.equal(selectResult.action, "select");

      // Test scroll down and up
      const scrollDown = await session.scroll("down");
      assert.equal(scrollDown.success, true);
      assert.equal(scrollDown.action, "scroll");

      const scrollUp = await session.scroll("up");
      assert.equal(scrollUp.success, true);
      assert.equal(scrollUp.action, "scroll");

      // Test scroll to element ref
      const scrollRef = await session.scroll("down", selectEl.ref);
      assert.equal(scrollRef.success, true);

      // Stale or invalid ref rejection
      const invalidScroll = await session.scroll("down", "invalid_ref");
      assert.equal(invalidScroll.success, false);
      assert.equal(invalidScroll.error, "INVALID_ELEMENT_REF");
    } finally {
      await session.close();
    }
  });

  it("detects stale element references after navigation", async () => {
    const session = await manager.createSession({ targetUrl: server.origin });
    try {
      await session.navigate("/");
      const firstSnapshot = await session.inspect();
      const initialBtn = firstSnapshot.elements[0];
      assert.ok(initialBtn);

      // Navigate to /cart
      await session.navigate("/cart");

      // Attempt to click the element from old page
      const staleClick = await session.click(initialBtn.ref);
      assert.equal(staleClick.success, false);
      assert.match(staleClick.error || "", /STALE_OR_MISSING_ELEMENT_REF/);
    } finally {
      await session.close();
    }
  });

  it("isolates storage and context between distinct artificial user sessions", async () => {
    const sessionA = await manager.createSession({ targetUrl: server.origin });
    const sessionB = await manager.createSession({ targetUrl: server.origin });
    try {
      // User A receives cookie
      await sessionA.navigate("/set-session");

      // User B inspects /check-session: must not have User A's cookie
      await sessionB.navigate("/check-session");
      const snapshotB = await sessionB.inspect();
      assert.match(snapshotB.textSummary, /cookie: none/);
    } finally {
      await sessionA.close();
      await sessionB.close();
    }
  });

  it("captures visual viewport screenshots and rejects when closed", async () => {
    const session = await manager.createSession({ targetUrl: server.origin });
    try {
      await session.navigate("/");
      const capture = await session.screenshot();
      assert.equal(capture.success, true);
      if (capture.success) {
        assert.equal(capture.mimeType, "image/png");
        assert.ok(Buffer.isBuffer(capture.data));
        assert.ok(capture.data.length > 100);
      }
    } finally {
      await session.close();
    }

    const closedCapture = await session.screenshot();
    assert.equal(closedCapture.success, false);
    assert.equal(closedCapture.error, "SESSION_CLOSED");
  });

  it("closes manager cleanly without throwing", async () => {
    const tempManager = createBrowserManager({ headless: true });
    const tempSession = await tempManager.createSession({ targetUrl: server.origin });
    await tempSession.navigate("/");
    await tempManager.close();
    assert.equal(tempManager.isClosed(), true);
  });
});
