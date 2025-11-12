import type { APIRoute } from 'astro'
import type { RoasteryDto } from '../../../types'
import { z } from 'zod'
import { jsonBadRequest, jsonError, jsonNotFound, jsonOk } from '../../../lib/http'
import { getRoasteryById } from '../../../lib/services/roasteries.service'

export const prerender = false

const ParamsSchema = z.object({
	id: z.string().uuid(),
})

export const GET: APIRoute = async (context) => {
	try {
		const parsed = ParamsSchema.safeParse(context.params)
		if (!parsed.success) {
			return jsonBadRequest('invalid_request', 'Invalid path params')
		}

		const { id } = parsed.data
		const roastery: RoasteryDto | null = await getRoasteryById(context.locals.supabase, id)

		if (!roastery) {
			return jsonNotFound('roastery_not_found', 'Roastery not found')
		}

		return jsonOk(roastery, {
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
		})
	} catch (err) {
		console.error('[GET /api/roasteries/{id}] error', { err })
		return jsonError('internal_error', 'Unexpected server error')
	}
}


