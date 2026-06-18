import assert from "node:assert/strict";
import { describe, it } from "node:test";

function offlinePathToHtmlFile(path) {
  const normalized = path.endsWith("/") ? path : `${path}/`;
  if (normalized === "/") return "index.html";
  return `${normalized.slice(1)}index.html`;
}

function withTrailingSlash(path) {
  if (path === "/") return "/";
  return path.endsWith("/") ? path : `${path}/`;
}

function joinBasePath(basePath, path) {
  const base = basePath.replace(/\/$/, "");
  const normalized = withTrailingSlash(path);
  if (!base) return normalized;
  return `${base}${normalized}`;
}

describe("offline-routes", () => {
  it("maps paths to static export html files", () => {
    assert.equal(offlinePathToHtmlFile("/"), "index.html");
    assert.equal(offlinePathToHtmlFile("/board/"), "board/index.html");
    assert.equal(offlinePathToHtmlFile("/settings/ai/"), "settings/ai/index.html");
  });

  it("normalizes trailing slashes", () => {
    assert.equal(withTrailingSlash("/board"), "/board/");
    assert.equal(withTrailingSlash("/board/"), "/board/");
    assert.equal(withTrailingSlash("/"), "/");
  });

  it("joins base path for GitHub Pages", () => {
    assert.equal(joinBasePath("/hesia", "/board/"), "/hesia/board/");
    assert.equal(joinBasePath("", "/reports/"), "/reports/");
  });
});