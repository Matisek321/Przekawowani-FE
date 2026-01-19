import type { APIRoute, AstroCookies } from 'astro'
import { json, jsonBadRequest, jsonError, jsonNotFound, jsonUnauthorized } from '../../../../lib/http'
import { UpsertRatingCommandSchema, UuidSchema } from '../../../../lib/validation/rating'
import {
	findCoffeeById,
	getMyRatingForCoffee,
	RatingsServiceError,
	toMyRatingDto,
	upsertMyRating,
} from '../../../../lib/services/ratings.service'

export const prerender = false

function getAccessToken(request: Request, cookies: AstroCookies): string | null {
	const header = request.headers.get('authorization') ?? ''
	const match = header.match(/^Bearer\s+(.+)$/i)
	if (match?.[1]) return match[1].trim()

	return cookies.get('sb-access-token')?.value ?? null
}

/**
 * GET /api/coffees/{id}/my-rating
 *
 * Returns the authenticated user's rating for a given coffee.
 *
 * Responses:
 * - 200: MyRatingDto
 * - 204: No Content (no rating yet)
 * - 400: validation_failed
 * - 401: unauthorized
 * - 404: coffee_not_found
 * - 500: internal_error
 */
export const GET: APIRoute = async (context) => {
	const requestId = context.request.headers.get('x-request-id') ?? crypto.randomUUID()

	try {
		const token = getAccessToken(context.request, context.cookies)
		if (!token) {
			return jsonUnauthorized('unauthorized', 'Missing access token')
		}

		const { data: userData, error: authError } = await context.locals.supabase.auth.getUser(token)
		if (authError || !userData?.user) {
			return jsonUnauthorized('unauthorized', 'Invalid access token')
		}
		const userId = userData.user.id

		const coffeeIdParsed = UuidSchema.safeParse(context.params.id)
		if (!coffeeIdParsed.success) {
			return jsonBadRequest('validation_failed', 'Invalid id')
		}
		const coffeeId = coffeeIdParsed.data

		try {
			await findCoffeeById(context.locals.supabase, coffeeId)
		} catch (err) {
			if (err instanceof RatingsServiceError && err.code === 'coffee_not_found') {
				return jsonNotFound('coffee_not_found', 'Coffee not found')
			}
			throw err
		}

		const rating = await getMyRatingForCoffee(context.locals.supabase, coffeeId, userId)
		if (!rating) {
			// User-scoped response: do not cache
			return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } })
		}

		// User-scoped response: do not cache
		return json(rating, { status: 200, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } })
	} catch (err) {
		console.error('[GET /api/coffees/{id}/my-rating] error', { err, requestId })
		return jsonError('internal_error', 'Unexpected server error')
	}
}

/**
 * PUT /api/coffees/{id}/my-rating
 *
 * Upserts the authenticated user's rating for a given coffee.
 *
 * Responses:
 * - 200: MyRatingDto (updated)
 * - 201: MyRatingDto (created)
 * - 400: validation_failed
 * - 401: unauthorized
 * - 404: coffee_not_found
 * - 500: internal_error
 */
export const PUT: APIRoute = async (context) => {
	const requestId = context.request.headers.get('x-request-id') ?? crypto.randomUUID()

	try {
		const token = getAccessToken(context.request, context.cookies)
		if (!token) {
			return jsonUnauthorized('unauthorized', 'Missing access token')
		}

		const { data: userData, error: authError } = await context.locals.supabase.auth.getUser(token)
		if (authError || !userData?.user) {
			return jsonUnauthorized('unauthorized', 'Invalid access token')
		}
		const userId = userData.user.id

		const coffeeIdParsed = UuidSchema.safeParse(context.params.id)
		if (!coffeeIdParsed.success) {
			return jsonBadRequest('validation_failed', 'Invalid id')
		}
		const coffeeId = coffeeIdParsed.data

		const rawJson = await context.request.json().catch(() => null)
		if (rawJson == null) {
			return jsonBadRequest('validation_failed', 'Invalid JSON body')
		}

		const bodyParsed = UpsertRatingCommandSchema.safeParse(rawJson)
		if (!bodyParsed.success) {
			return jsonBadRequest('validation_failed', 'Invalid rating payload')
		}

		try {
			await findCoffeeById(context.locals.supabase, coffeeId)
		} catch (err) {
			if (err instanceof RatingsServiceError && err.code === 'coffee_not_found') {
				return jsonNotFound('coffee_not_found', 'Coffee not found')
			}
			throw err
		}

		const row = await upsertMyRating(context.locals.supabase, userId, coffeeId, bodyParsed.data)
		const dto = toMyRatingDto(row)

		const isCreated = row.created_at === row.updated_at
		const status = isCreated ? 201 : 200

		// User-scoped response: do not cache
		return json(dto, { status, headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId } })
	} catch (err) {
		console.error('[PUT /api/coffees/{id}/my-rating] error', { err, requestId })
		return jsonError('internal_error', 'Unexpected server error')
	}
}

