import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Service-role client — bypass RLS. CHỈ dùng trên server (API routes).
 * Không import từ client components.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing env: SUPABASE_SERVICE_ROLE_KEY. Thêm vào .env.local (server-only)."
    );
  }
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
