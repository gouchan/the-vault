import { createClient } from "@supabase/supabase-js";

const fetchWithTimeout = (url: string | URL | Request, options?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
};

/**
 * Server client with service-role key — bypasses RLS.
 * Use this for all write operations (insert/update/delete) in server actions.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fall back to anon key if service role key isn't set (local dev)
  const key = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, key, {
    global: { fetch: fetchWithTimeout },
  });
}

/**
 * Server client with anon key — subject to RLS.
 * Use this for read-only operations if needed.
 */
export function createServerReadClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: fetchWithTimeout },
  });
}
