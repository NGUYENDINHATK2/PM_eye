export function supabaseUrl() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local."
    );
  }
  return v;
}

export function supabaseAnonKey() {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!v) {
    throw new Error(
      "Missing env: set either NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local."
    );
  }
  return v;
}
