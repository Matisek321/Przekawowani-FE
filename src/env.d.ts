/// <reference types="astro/client" />

import type { SupabaseClient } from './db/supabase.client'

interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_KEY: string
  readonly PUBLIC_SUPABASE_URL: string
  readonly PUBLIC_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient
      user: import('@supabase/supabase-js').User | null
      session: import('@supabase/supabase-js').Session | null
    }
  }
}
