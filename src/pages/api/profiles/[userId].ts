import type { APIRoute } from 'astro'
import { z } from 'zod'
import { getPublicProfileByUserId } from '../../../lib/services/profile.service'
import { jsonBadRequest, jsonError, jsonNotFound, jsonOk } from '../../../lib/http'

export const prerender = false

const paramsSchema = z.object({
  userId: z.string().uuid(),
})

export const GET: APIRoute = async (context) => {
  try {
    const parsed = paramsSchema.safeParse(context.params)
    if (!parsed.success) {
      return jsonBadRequest('invalid_request', 'userId must be a valid UUID')
    }

    const { userId } = parsed.data
    const profile = await getPublicProfileByUserId(context.locals.supabase, userId)

    if (!profile) {
      return jsonNotFound('profile_not_found', 'Profile not found')
    }

    return jsonOk(profile)
  } catch (err) {
    console.error('[GET /api/profiles/:userId] error', { err })
    return jsonError('internal_error', 'Unexpected server error')
  }
}


