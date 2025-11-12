import type { APIRoute } from 'astro'
import { z } from 'zod'
import { jsonBadRequest, jsonError, jsonNotFound, jsonOk } from '../../../../lib/http'
import { getRoasteryById } from '../../../../lib/services/roasteries.service'
import { fetchRoasteryCoffees } from '../../../../lib/services/roasteryCoffees.service'
import type { RoasteryCoffeeListResponse } from '../../../../types'
import { buildPaginationSchema } from '../../../../lib/validation/pagination'

export const prerender = false

const ParamsSchema = z.object({
	id: z.string().uuid(),
})

const QuerySchema = buildPaginationSchema({ defaultPage: 1, defaultPageSize: 30, maxPageSize: 100 })

export const GET: APIRoute = async (context) => {
	try {
		const parsedParams = ParamsSchema.safeParse(context.params)
		if (!parsedParams.success) {
			return jsonBadRequest('invalid_request', 'Invalid path params')
		}

		const url = new URL(context.request.url)
		const rawQuery = Object.fromEntries(url.searchParams.entries())
		const parsedQuery = QuerySchema.safeParse(rawQuery)
		if (!parsedQuery.success) {
			return jsonBadRequest('invalid_request', 'Invalid query params')
		}

		const roastery = await getRoasteryById(context.locals.supabase, parsedParams.data.id)
		if (!roastery) {
			return jsonNotFound('roastery_not_found', 'Roastery not found')
		}

		const { page, pageSize } = parsedQuery.data
		const { items, total } = await fetchRoasteryCoffees(
			context.locals.supabase,
			parsedParams.data.id,
			page,
			pageSize
		)

		const response: RoasteryCoffeeListResponse = {
			page,
			pageSize,
			total,
			items,
		}

		return jsonOk(response, {
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
		})
	} catch (err) {
		console.error('[GET /api/roasteries/{id}/coffees] error', { err })
		return jsonError('internal_error', 'Unexpected server error')
	}
}


