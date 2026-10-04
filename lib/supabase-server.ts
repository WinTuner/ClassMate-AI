import { createClient } from "@supabase/supabase-js";

// Server-only client (service role). NEVER import this from client components.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing Supabase server env");
  return createClient(url, key);
}
