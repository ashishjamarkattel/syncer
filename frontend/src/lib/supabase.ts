import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY || ''

let supabase: SupabaseClient

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL and Anon Key must be set in environment variables')
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }
