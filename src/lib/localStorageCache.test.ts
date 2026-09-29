// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCacheByPrefix,
  getCacheEntry,
  removeCacheEntry,
  setCacheEntry,
} from "./localStorageCache";

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe("localStorage cache", () => {
  it("stores versioned data until its TTL expires", () => {
    vi.useFakeTimers();
    setCacheEntry("public:browse:v1:all", ["listing"], 1000);
    expect(getCacheEntry<string[]>("public:browse:v1:all")).toEqual([
      "listing",
    ]);
    vi.advanceTimersByTime(1001);
    expect(getCacheEntry("public:browse:v1:all")).toBeUndefined();
    expect(localStorage.length).toBe(0);
  });

  it("drops malformed cache entries without throwing", () => {
    localStorage.setItem("dontbuyit:private:user:requests:v1:mine", "{broken");
    expect(getCacheEntry("private:user:requests:v1:mine")).toBeUndefined();
    expect(localStorage.length).toBe(0);
  });

  it("removes keys by prefix and removes individual keys", () => {
    setCacheEntry("private:user:requests:v1:mine", [], 1000);
    setCacheEntry("private:user:exchange:v1:id", { id: "id" }, 1000);
    setCacheEntry("public:browse:v1:all", [], 1000);
    clearCacheByPrefix("private:user:requests:v1:");
    expect(getCacheEntry("private:user:requests:v1:mine")).toBeUndefined();
    expect(getCacheEntry("private:user:exchange:v1:id")).toEqual({ id: "id" });
    removeCacheEntry("private:user:exchange:v1:id");
    expect(getCacheEntry("private:user:exchange:v1:id")).toBeUndefined();
    expect(getCacheEntry("public:browse:v1:all")).toEqual([]);
  });
});
