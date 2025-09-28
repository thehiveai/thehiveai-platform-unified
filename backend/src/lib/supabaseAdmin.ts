import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

function ensureAdmin(): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    // Moved the check to runtime access (NOT at module import)
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE at runtime");
  }
  if (_admin) return _admin;

  _admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
    db: { schema: "app" },
  });
  return _admin;
}

// Proxy delays creation until the first property/method access.
// Your existing imports keep working: import { supabaseAdmin } from "@/lib/supabaseAdmin"
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = ensureAdmin();
    // @ts-expect-error dynamic property forwarding
    return Reflect.get(client, prop, receiver);
  }
});

export default supabaseAdmin;
