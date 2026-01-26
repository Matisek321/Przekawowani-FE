import { defineMiddleware } from 'astro:middleware'

import { createSupabaseServerInstance } from '../db/supabase.client'
import { jsonUnauthorized } from '../lib/http'

const PUBLIC_PATHS = [
  '/login',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/logout',
  '/api/auth/me',
]

function buildReturnTo(url: URL) {
  return `${url.pathname}${url.search}`
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, url, redirect } = context

  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  })

  context.locals.supabase = supabase

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  context.locals.user = user ?? null
  context.locals.session = session ?? null

  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next()
  }

  if (url.pathname.startsWith('/api/')) {
    if (url.pathname.startsWith('/api/auth/')) {
      return next()
    }
    if (!user) {
      return jsonUnauthorized('unauthorized', 'Authentication required')
    }
    return next()
  }

  if (!user) {
    return redirect(`/login?returnTo=${encodeURIComponent(buildReturnTo(url))}`)
  }

  return next()
})


