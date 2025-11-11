/// <reference types="astro/client" />

import type { SupabaseClient } from './db/supabase.client';

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
    }
  }
}
