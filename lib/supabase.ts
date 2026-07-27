import { createClient } from "@supabase/supabase-js";

// Only used for Storage (inspection photos, VO supporting docs) once you're
// ready to deploy. Safe to import even when the env vars aren't set yet —
// callers should check `isSupabaseConfigured` before using it, since local
// dev runs entirely on SQLite/Prisma without Supabase.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
