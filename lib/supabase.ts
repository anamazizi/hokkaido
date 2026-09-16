import { createClient } from '@supabase/supabase-js'

// Safe fallback values for build-time (must be valid URL and non-empty string)
const FALLBACK_SUPABASE_URL = 'https://thfklgjldtdohuugjins.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoZmtsZ2psZHRkb2h1dWdqaW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Mjk4NjAsImV4cCI6MjA1MTAwNTg2MH0.4TELKXDZbbpGYZfEBSZ5Bz_LkGPg_uL8j_h96YVrl8o'

function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!envUrl || !isValidHttpUrl(envUrl)) {
    console.warn(
      'NEXT_PUBLIC_SUPABASE_URL is missing or invalid. Using fallback URL for build-time.'
    )
    return FALLBACK_SUPABASE_URL
  }
  return envUrl
}

function getSupabaseAnonKey(): string {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!envKey || typeof envKey !== 'string' || envKey.trim().length === 0) {
    console.warn(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid. Using fallback key for build-time.'
    )
    return FALLBACK_SUPABASE_ANON_KEY
  }
  return envKey
}

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = getSupabaseAnonKey()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)