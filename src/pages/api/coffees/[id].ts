import type { APIRoute } from 'astro'
import { jsonBadRequest, jsonError, jsonNotFound, jsonOk } from '../../../lib/http'
import { coffeePathParamsSchema } from '../../../lib/validation/coffees'
import { getCoffeeById } from '../../../lib/services/coffee.service'
import type { CoffeeDetailDto } from '../../../types'

export const prerender = false

/**
 * GET /api/coffees/{id}
 *
 * Returns coffee details with aggregated metrics sourced from `public.coffee_aggregates`.
 *
 * Responses:
 * - 200: CoffeeDetailDto
 * - 400: Invalid id (non-UUID)
 * - 404: Coffee not found
 * - 500: Internal server error
 */
export const GET: APIRoute = async (context) => {
	const requestId = context.request.headers.get('x-request-id') ?? undefined

	try {
		const parsedParams = coffeePathParamsSchema.safeParse(context.params)
		if (!parsedParams.success) {
			return jsonBadRequest('validation_failed', 'Invalid id')
		}

		const { id } = parsedParams.data
		const coffee: CoffeeDetailDto | null = await getCoffeeById(context.locals.supabase, id)

		if (!coffee) {
			return jsonNotFound('coffee_not_found', 'Coffee not found')
		}

		return jsonOk(coffee, {
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
		})
	} catch (err) {
		console.error('[GET /api/coffees/{id}] error', { err, requestId })
		return jsonError('internal_error', 'Unexpected error')
	}
}

