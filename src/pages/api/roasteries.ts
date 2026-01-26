import type { APIRoute } from 'astro'
import type { RoasteryDto, RoasteryListResponse } from '../../types'
import {
	jsonBadRequest,
	jsonConflict,
	jsonCreated,
	jsonError,
	jsonOk,
	jsonUnauthorized,
} from '../../lib/http'
import { CreateRoasteryBodySchema, GetRoasteriesQuerySchema } from '../../lib/validation/roasteries'
import { normalizeForSearch } from '../../lib/normalization'
import { createRoastery, listRoasteries } from '../../lib/services/roasteries.service'

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

/**
 * POST /api/roasteries
 *
 * Creates a new roastery for an authenticated user.
 * Responds with the created roastery DTO and Location header.
 */
export const POST: APIRoute = async (context) => {
	try {
		const requestId = crypto.randomUUID()
		const supabase = context.locals.supabase

		const {
			data: { user },
		} = await supabase.auth.getUser()
		if (!user) {
			return jsonUnauthorized('unauthorized', 'Authentication required')
		}

		const body = await context.request.json().catch(() => null)
		const parsed = CreateRoasteryBodySchema.safeParse(body)
		if (!parsed.success) {
			return jsonBadRequest('validation_failed', 'Invalid payload')
		}

		try {
			const dto: RoasteryDto = await createRoastery(supabase, parsed.data)
			return jsonCreated(dto, {
				Location: `/api/roasteries/${dto.id}`,
				'X-Request-Id': requestId,
			})
		} catch (err: unknown) {
			const code = (err as { code?: string })?.code || (err as Error)?.message
			if (code === 'roastery_duplicate') {
				return jsonConflict('roastery_duplicate', 'Roastery already exists', {
					'X-Request-Id': requestId,
				})
			}
			throw err
		}
	} catch (err) {
		console.error('[POST /api/roasteries] error', { err })
		return jsonError('internal_error', 'Unexpected server error')
	}
}


