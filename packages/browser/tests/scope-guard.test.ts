import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ScopeViolationError,
  assertInScope,
  isAllowedSubresource,
  isUrlInScope,
  normalizeTargetUrl,
} from "../scope-guard.ts";

describe("scope guard", () => {
  describe("normalizeTargetUrl", () => {
    it("normalizes valid http and https URLs and strips hash", () => {
      assert.equal(normalizeTargetUrl("http://localhost:3000/app#test"), "http://localhost:3000/app");
      assert.equal(normalizeTargetUrl("https://127.0.0.1:8080/"), "https://127.0.0.1:8080/");
    });

    it("rejects invalid, empty, or whitespace target URLs", () => {
      assert.throws(() => normalizeTargetUrl(""), ScopeViolationError);
      assert.throws(() => normalizeTargetUrl("   "), ScopeViolationError);
      assert.throws(() => normalizeTargetUrl("not-a-url"), ScopeViolationError);
    });

    it("rejects non-http/https protocols", () => {
      assert.throws(() => normalizeTargetUrl("file:///etc/passwd"), ScopeViolationError);
      assert.throws(() => normalizeTargetUrl("javascript:alert(1)"), ScopeViolationError);
      assert.throws(() => normalizeTargetUrl("ws://localhost:3000"), ScopeViolationError);
    });

    it("rejects target URLs with embedded credentials", () => {
      assert.throws(() => normalizeTargetUrl("http://admin:secret@localhost:3000"), ScopeViolationError);
    });
  });

  describe("isUrlInScope", () => {
    const target = "http://localhost:3000/app";

    it("accepts URLs with matching protocol, host, and port", () => {
      assert.equal(isUrlInScope("http://localhost:3000/app/dashboard", target), true);
      assert.equal(isUrlInScope("http://localhost:3000/login", target), true);
      assert.equal(isUrlInScope("/settings", target), true);
    });

    it("rejects URLs with different port, host, or protocol", () => {
      assert.equal(isUrlInScope("http://localhost:4000/app", target), false);
      assert.equal(isUrlInScope("http://127.0.0.1:3000/app", target), false);
      assert.equal(isUrlInScope("https://localhost:3000/app", target), false);
      assert.equal(isUrlInScope("https://external-site.com", target), false);
    });

    it("rejects credentials or dangerous schemes", () => {
      assert.equal(isUrlInScope("http://admin:secret@localhost:3000/app", target), false);
      assert.equal(isUrlInScope("javascript:alert(1)", target), false);
      assert.equal(isUrlInScope("file:///tmp", target), false);
    });
  });

  describe("assertInScope", () => {
    const target = "http://localhost:3000/app";

    it("returns fully resolved URL when in scope", () => {
      assert.equal(assertInScope("/products/42", target), "http://localhost:3000/products/42");
      assert.equal(assertInScope("http://localhost:3000/cart", target), "http://localhost:3000/cart");
    });

    it("throws ScopeViolationError when out of scope", () => {
      assert.throws(
        () => assertInScope("http://evil.com/phish", target),
        (err) => err instanceof ScopeViolationError && err.attemptedUrl === "http://evil.com/phish",
      );
    });
  });

  describe("isAllowedSubresource", () => {
    const target = "http://localhost:3000/";

    it("allows data and blob URLs for inline assets", () => {
      assert.equal(isAllowedSubresource("data:image/png;base64,abc", target), true);
      assert.equal(isAllowedSubresource("blob:http://localhost:3000/uuid", target), true);
    });

    it("allows in-scope assets and rejects third-party origins", () => {
      assert.equal(isAllowedSubresource("http://localhost:3000/style.css", target), true);
      assert.equal(isAllowedSubresource("https://tracker.external.com/ping", target), false);
    });
  });
});
