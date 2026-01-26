import type { AstroCookies } from 'astro'
import { createServerClient, createBrowserClient, type CookieOptionsWithName } from '@supabase/ssr'

import type { Database } from './database.types'

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_KEY

export type SupabaseClient = ReturnType<typeof createServerClient<Database>>

export const cookieOptions: CookieOptionsWithName = {
  path: '/',
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: 'lax',
}

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return []
  return cookieHeader.split(';').map((cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    return { name, value: rest.join('=') }
  })
}

export const createSupabaseServerInstance = (context: {
  headers: Headers
  cookies: AstroCookies
}) => {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get('Cookie') ?? '')
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options),
        )
      },
    },
  })
}

export const createSupabaseBrowserClient = () => {
  return createBrowserClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  )
}