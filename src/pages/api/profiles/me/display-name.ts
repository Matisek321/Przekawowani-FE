import type { APIRoute } from 'astro'
import { z } from 'zod'
import { setDisplayNameOnce } from '../../../../lib/services/profile.service'
import { jsonBadRequest, jsonConflict, jsonCreated, jsonError, jsonUnauthorized } from '../../../../lib/http'

export const prerender = false

const bodySchema = z.object({
  displayName: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .-]+$/),
})

export const POST: APIRoute = async (context) => {
  try {
    const requestId = crypto.randomUUID()
    const supabase = context.locals.supabase
    const user = context.locals.user

    if (!user) {
      return jsonUnauthorized('unauthorized', 'Authentication required')
    }

    const userId = user.id

    const json = await context.request.json().catch(() => null)
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return jsonBadRequest('validation_failed', 'Invalid displayName format')
    }

    try {
      const dto = await setDisplayNameOnce(supabase, userId, parsed.data.displayName)
      return jsonCreated(dto, { 'X-Request-Id': requestId })
    } catch (err: any) {
      const code = err?.code || err?.cause?.code || err?.message
      if (code === 'display_name_already_set') {
        return jsonConflict('display_name_already_set', 'Display name already set')
      }
      if (err?.code === '23505') {
        return jsonConflict('display_name_conflict', 'Display name already taken')
      }
      throw err
    }
  } catch (err) {
    console.error('[POST /api/profiles/me/display-name] error', { err })
    return jsonError('internal_error', 'Unexpected server error')
  }
}


