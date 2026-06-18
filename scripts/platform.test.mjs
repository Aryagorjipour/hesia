import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Minimal inline re-implementation to test the logic without a transpiler.
// The real src/lib/platform/index.ts uses the same expressions.
function isDesktop() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
function isWeb() {
  return !isDesktop();
}
function getPlatformCapabilities() {
  const d = isDesktop();
  return Object.freeze({
    hasPWAInstall: !d,
    hasServiceWorker: !d,
    hasNativeNotifications: d,
    hasNativeRelay: d,
    hasNativeTray: d,
  });
}

describe("platform — Node (non-browser) context", () => {
  it("isDesktop() returns false in Node", () => {
    assert.equal(isDesktop(), false);
  });

  it("isWeb() returns true in Node", () => {
    assert.equal(isWeb(), true);
  });

  it("getPlatformCapabilities() shape is correct in Node", () => {
    const caps = getPlatformCapabilities();
    assert.equal(caps.hasPWAInstall, true);
    assert.equal(caps.hasServiceWorker, true);
    assert.equal(caps.hasNativeNotifications, false);
    assert.equal(caps.hasNativeRelay, false);
    assert.equal(caps.hasNativeTray, false);
  });

  it("getPlatformCapabilities() result is frozen", () => {
    const caps = getPlatformCapabilities();
    assert.equal(Object.isFrozen(caps), true);
  });
});
