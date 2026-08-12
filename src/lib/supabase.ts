import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tsiukeysujipagaoauii.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fjG-CCDQlu7H28Uo7Fw_HA_VHohSwCZ';

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
