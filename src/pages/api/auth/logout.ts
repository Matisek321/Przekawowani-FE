import type { APIRoute } from 'astro'
import { jsonError, jsonOk } from '../../../lib/http'
import { logoutUser } from '../../../lib/services/auth.service'

export const prerender = false

export const POST: APIRoute = async (context) => {
  try {
    await logoutUser(context.locals.supabase)
    return jsonOk({ ok: true }, { 'Cache-Control': 'no-store' })
  } catch (err) {
    console.error('[POST /api/auth/logout] error', { err })
    return jsonError('internal_error', 'Unexpected server error')
  }
}
