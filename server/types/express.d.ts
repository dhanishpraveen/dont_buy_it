import type { SupabaseRequestUser } from "./auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: SupabaseRequestUser;
    }
  }
}

export {};
