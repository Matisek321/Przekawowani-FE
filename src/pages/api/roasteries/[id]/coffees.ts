import type { APIRoute } from 'astro'
import { jsonBadRequest, jsonConflict, jsonCreated, jsonError, jsonNotFound, jsonOk, jsonUnauthorized } from '../../../../lib/http'
import { fetchRoasteryCoffees, RoasteryCoffeesServiceError } from '../../../../lib/services/roasteryCoffees.service'
import { createCoffee, CoffeeServiceError } from '../../../../lib/services/coffee.service'
import { buildPaginationSchema } from '../../../../lib/validation/pagination'
import { coffeePathParamsSchema, createCoffeeCommandSchema } from '../../../../lib/validation/coffees'

export const prerender = false

const QuerySchema = buildPaginationSchema({ defaultPage: 1, defaultPageSize: 30, maxPageSize: 100 })

export const GET: APIRoute = async (context) => {
	try {
		const parsedParams = coffeePathParamsSchema.safeParse(context.params)
		if (!parsedParams.success) {
			return jsonBadRequest('invalid_request', 'Invalid path params')
		}

		const url = new URL(context.request.url)
		const rawQuery = Object.fromEntries(url.searchParams.entries())
		const parsedQuery = QuerySchema.safeParse(rawQuery)
		if (!parsedQuery.success) {
			return jsonBadRequest('invalid_request', 'Invalid query params')
		}

		const { page, pageSize } = parsedQuery.data
		const response = await fetchRoasteryCoffees(
			context.locals.supabase,
			parsedParams.data.id,
			page,
			pageSize
		)

		return jsonOk(response, {
			'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
		})
	} catch (err) {
		if (err instanceof RoasteryCoffeesServiceError) {
			if (err.code === 'roastery_not_found') {
				return jsonNotFound('roastery_not_found', err.message)
			}
			console.error('[GET /api/roasteries/{id}/coffees] service error', { err })
			return jsonError('internal_error', 'Unexpected server error')
		}

		console.error('[GET /api/roasteries/{id}/coffees] error', { err })
		return jsonError('internal_error', 'Unexpected server error')
	}
}

/**
 * POST /api/roasteries/{id}/coffees
 * Creates a new coffee for the specified roastery.
 * Requires authentication via Bearer token.
 */
export const POST: APIRoute = async (context) => {
	try {
		// 1) Authenticate user via Bearer token
		const authHeader = context.request.headers.get('Authorization')
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return jsonUnauthorized('unauthorized', 'Missing or invalid authorization header')
		}

		const token = authHeader.slice(7) // Remove 'Bearer ' prefix
		const { data: userData, error: authError } = await context.locals.supabase.auth.getUser(token)

		if (authError || !userData.user) {
			return jsonUnauthorized('unauthorized', 'Invalid or expired token')
		}

		// 2) Validate path parameters
		const parsedParams = coffeePathParamsSchema.safeParse(context.params)
		if (!parsedParams.success) {
			return jsonBadRequest('validation_failed', 'Invalid roastery ID format')
		}

		// 3) Parse and validate request body
		let body: unknown
		try {
			body = await context.request.json()
		} catch {
			return jsonBadRequest('validation_failed', 'Invalid JSON body')
		}

		const parsedBody = createCoffeeCommandSchema.safeParse(body)
		if (!parsedBody.success) {
			const firstError = parsedBody.error.errors[0]
			return jsonBadRequest('validation_failed', firstError?.message ?? 'Invalid request body')
		}

		// 4) Create coffee via service
		const coffeeDto = await createCoffee(
			context.locals.supabase,
			parsedParams.data.id,
			parsedBody.data
		)

		// 5) Return 201 Created with CoffeeDto
		return jsonCreated(coffeeDto as unknown as Record<string, unknown>)
	} catch (err) {
		// Handle domain-specific errors
		if (err instanceof CoffeeServiceError) {
			switch (err.code) {
				case 'roastery_not_found':
					return jsonNotFound('roastery_not_found', err.message)
				case 'coffee_duplicate':
					return jsonConflict('coffee_duplicate', err.message)
				case 'server_error':
					console.error('[POST /api/roasteries/{id}/coffees] service error', { error: err })
					return jsonError('server_error', 'Unexpected server error')
			}
		}

		// Log and return generic error for unexpected exceptions
		console.error('[POST /api/roasteries/{id}/coffees] unexpected error', { err })
		return jsonError('server_error', 'Unexpected server error')
	}
}

