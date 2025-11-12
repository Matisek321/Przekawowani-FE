import type { APIRoute } from 'astro'
import type { RoasteryListResponse } from '../../types'
import { jsonBadRequest, jsonError, jsonOk } from '../../lib/http'
import { GetRoasteriesQuerySchema } from '../../lib/validation/roasteries'
import { normalizeForSearch } from '../../lib/normalization'
import { listRoasteries } from '../../lib/services/roasteries.service'

export const prerender = false

export const GET: APIRoute = async (context) => {
	try {
		const url = new URL(context.request.url)
		const rawQuery = Object.fromEntries(url.searchParams.entries())

		const parsed = GetRoasteriesQuerySchema.safeParse(rawQuery)
		if (!parsed.success) {
			return jsonBadRequest('invalid_request', 'Invalid query')
		}

		const { q, city, page, pageSize } = parsed.data
		const qNorm = q ? normalizeForSearch(q) : undefined
		const cityNorm = city ? normalizeForSearch(city) : undefined

		const { items, total } = await listRoasteries(context.locals.supabase, {
			qNorm,
			cityNorm,
			page,
			pageSize,
		})

		const body: RoasteryListResponse = { page, pageSize, total, items }
		return jsonOk(body, {
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
		})
	} catch (err) {
		console.error('[GET /api/roasteries] error', { err })
		return jsonError('internal_error', 'Unexpected server error')
	}
}


