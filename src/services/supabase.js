/**
 * supabase.js - Supabase Client Config
 * 
 * Safely initializes the Supabase client using Vite environment variables.
 * Gracefully defaults to null if credentials are not configured,
 * signaling the database service to fall back to the local mock state.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-id.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("📡 Connected to Supabase Cloud Database successfully!");
  } catch (err) {
    console.error("❌ Failed to initialize Supabase client:", err);
  }
} else {
  console.warn(
    "⚠️ Supabase URL or Anon Key is missing in the .env configuration.\n" +
    "🔗 Standard fallback to Local Persistent Mock Database is active!"
  );
}

export { supabase };
export default supabase;
