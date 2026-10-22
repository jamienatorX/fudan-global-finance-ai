'use client';
import { createBrowserClient } from '@supabase/ssr';
import { supabaseConfig } from './config';

export function createBrowserSupabaseClient() {
  const { url, key } = supabaseConfig();
  return createBrowserClient(url, key);
}
