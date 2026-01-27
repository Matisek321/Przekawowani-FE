import type { APIRoute } from 'astro'
import { jsonError, jsonOk, jsonUnauthorized } from '../../lib/http'
import { deleteAccount } from '../../lib/services/account.service'

export const prerender = false

/**
 * DELETE /api/account
 * Deletes the current user's account completely.
 * Requires authentication.
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const { user, supabase } = context.locals

    if (!user) {
      return jsonUnauthorized('unauthorized', 'Authentication required')
    }

    await deleteAccount(supabase, user.id)

    return jsonOk({ success: true }, { 'Cache-Control': 'no-store' })
  } catch (err) {
    console.error('[DELETE /api/account] error', { err })

    const error = err as Error & { code?: string }

    if (error.code === 'delete_profile_failed') {
      return jsonError('delete_profile_failed', 'Nie udało się usunąć profilu')
    }

    if (error.code === 'delete_auth_user_failed') {
      return jsonError('delete_auth_user_failed', 'Nie udało się usunąć konta')
    }

    return jsonError('internal_error', 'Nieoczekiwany błąd serwera')
  }
}
