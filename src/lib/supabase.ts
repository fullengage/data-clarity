import { createClient } from '@supabase/supabase-js';

// Supabase configuration (public keys)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bfsatiyhcywneoderhij.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmc2F0aXloY3l3bmVvZGVyaGlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzI4MjQsImV4cCI6MjA4MTY0ODgyNH0.R0kIuWsDg0fR6o4dPq4NDKPeGQownmA8kQe3wkq8hh8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-client-info': 'data-clarity-app'
    }
  }
});
