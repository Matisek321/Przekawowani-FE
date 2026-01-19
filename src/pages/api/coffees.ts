import type { APIRoute } from 'astro'
import type { CoffeeListResponse } from '../../types'
import { jsonBadRequest, jsonError, jsonOk } from '../../lib/http'
import { getCoffeesQuerySchema } from '../../lib/validation/coffees'
import { normalizeForSearch } from '../../lib/normalization'
import { listCoffees } from '../../lib/services/coffee.service'

export const prerender = false

/**
 * GET /api/coffees
 *
 * Returns a paginated list of coffees sorted by rating (descending).
 * Supports optional filtering by roastery ID and search by name.
 *
 * Query parameters:
 * - page: number (default: 1, min: 1)
 * - pageSize: number (default: 100, max: 100)
 * - roasteryId: uuid (optional, filter by roastery)
 * - q: string (optional, search by name, 1-64 chars)
 * - sort: 'rating_desc' (default, only supported option)
 *
 * Responses:
 * - 200: CoffeeListResponse with paginated coffee items
 * - 400: Invalid query parameters
 * - 500: Internal server error
 */
export const GET: APIRoute = async (context) => {
	try {
		const url = new URL(context.request.url)
		const rawQuery = Object.fromEntries(url.searchParams.entries())

		// Validate query parameters
		const parsed = getCoffeesQuerySchema.safeParse(rawQuery)
		if (!parsed.success) {
			return jsonBadRequest('validation_failed', 'Invalid query parameters')
		}

		const { page, pageSize, roasteryId, q } = parsed.data

		// Normalize search query if provided
		const qNorm = q ? normalizeForSearch(q) : undefined

		// Fetch coffees from service
		const { items, total } = await listCoffees(context.locals.supabase, {
			page,
			pageSize,
			roasteryId,
			qNorm,
		})

		// Build response
		const body: CoffeeListResponse = {
			page,
			pageSize,
			total,
			items,
		}

		return jsonOk(body, {
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
		})
	} catch (err) {
		console.error('[GET /api/coffees] error', { err })
		return jsonError('server_error', 'Unexpected server error')
	}
}
