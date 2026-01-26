import type { APIRoute } from 'astro'
import { jsonBadRequest, jsonError, jsonOk, jsonUnauthorized } from '../../../lib/http'
import { ResetPasswordBodySchema } from '../../../lib/validation/auth'
import { updatePassword } from '../../../lib/services/auth.service'

export const prerender = false

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json().catch(() => null)
    const parsed = ResetPasswordBodySchema.safeParse(body)
    if (!parsed.success) {
      return jsonBadRequest('validation_failed', 'Invalid payload')
    }

    const {
      data: { user },
    } = await context.locals.supabase.auth.getUser()

    if (!user) {
      return jsonUnauthorized('invalid_token', 'Invalid or expired token')
    }

    try {
      await updatePassword(context.locals.supabase, parsed.data.password)
      return jsonOk({ ok: true }, { 'Cache-Control': 'no-store' })
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || (err as Error)?.message
      if (code === 'weak_password') {
        return jsonBadRequest('weak_password', 'Weak password')
      }
      if (code === 'invalid_token') {
        return jsonUnauthorized('invalid_token', 'Invalid or expired token')
      }
      return jsonError('internal_error', 'Unexpected server error')
    }
  } catch (err) {
    console.error('[POST /api/auth/reset-password] error', { err })
    return jsonError('internal_error', 'Unexpected server error')
  }
}
