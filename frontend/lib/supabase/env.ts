const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export function getSupabaseEnv() {
  if (!hasSupabaseEnv()) {
    throw new Error(
      'Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local.',
    )
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}
