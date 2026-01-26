import type { APIRoute } from 'astro'
import { json, jsonBadRequest, jsonConflict, jsonError, jsonTooManyRequests } from '../../../lib/http'
import { RegisterBodySchema } from '../../../lib/validation/auth'
import { registerUser } from '../../../lib/services/auth.service'

export const prerender = false

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json().catch(() => null)
    const parsed = RegisterBodySchema.safeParse(body)
    if (!parsed.success) {
      return jsonBadRequest('validation_failed', 'Invalid payload')
    }

    try {
      const result = await registerUser(
        context.locals.supabase,
        parsed.data.email,
        parsed.data.password,
      )
      return json(
        {
          message: 'Registration successful',
          requiresEmailConfirmation: result.requiresEmailConfirmation,
        },
        { status: 201, headers: { 'Cache-Control': 'no-store' } },
      )
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || (err as Error)?.message
      if (code === 'email_taken') {
        return jsonConflict('email_taken', 'Email already registered')
      }
      if (code === 'weak_password' || code === 'invalid_email') {
        return jsonBadRequest(code, 'Invalid registration data')
      }
      if (code === 'too_many_requests') {
        return jsonTooManyRequests('too_many_requests', 'Too many requests')
      }
      return jsonError('internal_error', 'Unexpected server error')
    }
  } catch (err) {
    console.error('[POST /api/auth/register] error', { err })
    return jsonError('internal_error', 'Unexpected server error')
  }
}
