import mongoose from "mongoose";

export type DatabaseMode = "mock" | "mongo" | "supabase";

export function getDatabaseMode(): DatabaseMode {
  const configuredMode = process.env.DATABASE_MODE?.trim().toLowerCase();
  if (
    configuredMode === "mongo" ||
    configuredMode === "mock" ||
    configuredMode === "supabase"
  )
    return configuredMode;
  const hasSupabaseConfig = Boolean(
    (process.env.SUPABASE_URL?.trim() ||
      process.env.VITE_SUPABASE_URL?.trim()) &&
    (process.env.SUPABASE_ANON_KEY?.trim() ||
      process.env.VITE_SUPABASE_ANON_KEY?.trim()),
  );
  return hasSupabaseConfig ? "supabase" : "mock";
}

export async function connectToDatabase(): Promise<void> {
  const mode = getDatabaseMode();
  if (mode !== "mongo") {
    console.log(`[DB] Using ${mode} listing persistence mode.`);
    return;
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri)
    throw new Error("MONGODB_URI is required when DATABASE_MODE=mongo.");
  if (mongoose.connection.readyState === 1) return;

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("[DB] MongoDB connected.");
  } catch (error) {
    console.error(
      "[DB] MongoDB connection failed.",
      error instanceof Error ? error.message : "unknown error",
    );
    throw new Error(
      "MongoDB connection failed. Check MONGODB_URI and database availability.",
    );
  }
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
