/// <reference types="astro/client" />

import type { SupabaseClient, SupabaseEnv } from './db/supabase.client'

interface ImportMetaEnv {
  readonly SUPABASE_URL: string
  readonly SUPABASE_KEY: string
  readonly PUBLIC_SUPABASE_URL: string
  readonly PUBLIC_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_ROLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

type CloudflareEnv = {
  SUPABASE_URL: string
  SUPABASE_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

type Runtime = import('@astrojs/cloudflare').Runtime<CloudflareEnv>

declare global {
  namespace App {
    interface Locals extends Runtime {
      supabase: SupabaseClient
      supabaseEnv: SupabaseEnv
      user: import('@supabase/supabase-js').User | null
      session: import('@supabase/supabase-js').Session | null
    }
  }
}
