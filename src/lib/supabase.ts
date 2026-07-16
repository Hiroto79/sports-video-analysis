import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValidKey = supabaseAnonKey && 
                     supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE' && 
                     supabaseAnonKey.trim() !== '';

export const supabase = isValidKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  : null;
