import type { APIRoute } from 'astro'
import { json, jsonBadRequest, jsonError, jsonForbidden, jsonTooManyRequests, jsonUnauthorized } from '../../../lib/http'
import { LoginBodySchema } from '../../../lib/validation/auth'
import { loginUser } from '../../../lib/services/auth.service'

export const prerender = false

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json().catch(() => null)
    const parsed = LoginBodySchema.safeParse(body)
    if (!parsed.success) {
      return jsonBadRequest('validation_failed', 'Invalid payload')
    }

    try {
      const result = await loginUser(
        context.locals.supabase,
        parsed.data.email,
        parsed.data.password,
      )
      return json(result, { status: 200, headers: { 'Cache-Control': 'no-store' } })
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || (err as Error)?.message
      if (code === 'invalid_credentials') {
        return jsonUnauthorized('invalid_credentials', 'Invalid credentials')
      }
      if (code === 'email_not_confirmed') {
        return jsonForbidden('email_not_confirmed', 'Email not confirmed')
      }
      if (code === 'too_many_requests') {
        return jsonTooManyRequests('too_many_requests', 'Too many requests')
      }
      return jsonError('internal_error', 'Unexpected server error')
    }
  } catch (err) {
    console.error('[POST /api/auth/login] error', { err })
    return jsonError('internal_error', 'Unexpected server error')
  }
}
