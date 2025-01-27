import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jxqwxjqwvzpxvtmqxgqc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4cXd4anF3dnpweHZ0bXF4Z3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDc0ODg0MDAsImV4cCI6MjAyMzA2NDQwMH0.NQGG5V3Yw8qdcJF-dBiKRsN_4VgOEX6c4_Qj_cGUxYY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});