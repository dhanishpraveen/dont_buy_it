import { afterEach, describe, expect, it, vi } from "vitest";
import { getDatabaseMode } from "./database.js";

const supabaseKeys = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
] as const;
const originalSupabaseValues = new Map(
  supabaseKeys.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  delete process.env.DATABASE_MODE;
  delete process.env.MONGODB_URI;
  supabaseKeys.forEach((key) => {
    const value = originalSupabaseValues.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  vi.restoreAllMocks();
});

describe("database configuration", () => {
  it("defaults to mock mode when Supabase is not configured", () => {
    supabaseKeys.forEach((key) => delete process.env[key]);
    expect(getDatabaseMode()).toBe("mock");
  });

  it("automatically selects Supabase when URL and anon key are configured", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "public-anon-key";
    expect(getDatabaseMode()).toBe("supabase");
  });

  it("accepts explicit MongoDB mode without exposing the URI", () => {
    process.env.DATABASE_MODE = "mongo";
    process.env.MONGODB_URI = "mongodb://example.invalid/test";
    expect(getDatabaseMode()).toBe("mongo");
  });
});
