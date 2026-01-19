import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PUT } from '../../src/pages/api/coffees/[id]/my-rating'
import * as ratingsService from '../../src/lib/services/ratings.service'

type TestContext = {
	request: Request
	params: Record<string, string | undefined>
	locals: Record<string, any>
	cookies: { get: (name: string) => { value: string } | undefined }
}

function makeContext(options: {
	method?: 'GET' | 'PUT'
	id?: string
	authorization?: string
	cookieToken?: string
	body?: unknown
	rawBody?: string
	requestId?: string
}): TestContext {
	const method = options.method ?? 'PUT'
	const id = options.id ?? '3b76d2d4-61dd-4dc0-97a2-b94ad4f0fbd9'

	const headers: Record<string, string> = {}
	if (options.authorization) headers.authorization = options.authorization
	if (options.requestId) headers['x-request-id'] = options.requestId
	if (options.rawBody != null || options.body != null) headers['Content-Type'] = 'application/json'

	const bodyString =
		options.rawBody != null ? options.rawBody : options.body != null ? JSON.stringify(options.body) : undefined

	const request = new Request(`http://localhost/api/coffees/${id}/my-rating`, {
		method,
		headers,
		body: bodyString,
	})

	const getUser = vi.fn()

	const cookies = {
		get: (name: string) => {
			if (name !== 'sb-access-token') return undefined
			return options.cookieToken ? { value: options.cookieToken } : undefined
		},
	}

	return {
		request,
		params: { id },
		cookies,
		locals: {
			supabase: {
				auth: { getUser },
			},
		},
	}
}

describe('GET /api/coffees/{id}/my-rating', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 401 when access token is missing', async () => {
		const context = makeContext({
			method: 'GET',
			authorization: undefined,
			cookieToken: undefined,
		})

		const res = await GET(context as any)
		expect(res.status).toBe(401)
		expect(await res.json()).toEqual({
			code: 'unauthorized',
			message: 'Missing access token',
		})
	})

	it('returns 401 when token is invalid', async () => {
		const context = makeContext({
			method: 'GET',
			authorization: 'Bearer badtoken',
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

		const res = await GET(context as any)
		expect(res.status).toBe(401)
		expect(await res.json()).toEqual({
			code: 'unauthorized',
			message: 'Invalid access token',
		})
	})

	it('returns 400 for invalid coffee id (non-UUID)', async () => {
		const context = makeContext({
			method: 'GET',
			id: 'not-a-uuid',
			authorization: 'Bearer ok',
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: 'e10590bb-e06c-4013-bbbc-c17cff05907d' } },
			error: null,
		})

		const res = await GET(context as any)
		expect(res.status).toBe(400)
		expect(await res.json()).toEqual({
			code: 'validation_failed',
			message: 'Invalid id',
		})
	})

	it('returns 404 when coffee does not exist', async () => {
		const context = makeContext({
			method: 'GET',
			authorization: 'Bearer ok',
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: 'e10590bb-e06c-4013-bbbc-c17cff05907d' } },
			error: null,
		})
		vi.spyOn(ratingsService, 'findCoffeeById').mockRejectedValueOnce(
			new ratingsService.RatingsServiceError('coffee_not_found', 'Coffee with id X not found')
		)

		const res = await GET(context as any)
		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({
			code: 'coffee_not_found',
			message: 'Coffee not found',
		})
	})

	it('returns 204 when coffee exists but rating is missing', async () => {
		const coffeeId = '3b76d2d4-61dd-4dc0-97a2-b94ad4f0fbd9'
		const userId = 'e10590bb-e06c-4013-bbbc-c17cff05907d'
		const requestId = 'req-123'

		const context = makeContext({
			method: 'GET',
			id: coffeeId,
			authorization: 'Bearer ok',
			requestId,
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: userId } }, error: null })

		vi.spyOn(ratingsService, 'findCoffeeById').mockResolvedValueOnce(undefined)
		vi.spyOn(ratingsService, 'getMyRatingForCoffee').mockResolvedValueOnce(null)

		const res = await GET(context as any)
		expect(res.status).toBe(204)
		expect(res.headers.get('cache-control')).toBe('no-store')
		expect(res.headers.get('x-request-id')).toBe(requestId)
		expect(await res.text()).toBe('')
	})

	it('returns 200 with MyRatingDto when rating exists', async () => {
		const coffeeId = '3b76d2d4-61dd-4dc0-97a2-b94ad4f0fbd9'
		const userId = 'e10590bb-e06c-4013-bbbc-c17cff05907d'
		const requestId = 'req-456'

		const context = makeContext({
			method: 'GET',
			id: coffeeId,
			authorization: 'Bearer ok',
			requestId,
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: userId } }, error: null })

		vi.spyOn(ratingsService, 'findCoffeeById').mockResolvedValueOnce(undefined)
		vi.spyOn(ratingsService, 'getMyRatingForCoffee').mockResolvedValueOnce({
			id: '5c7b1c9a-0c0f-4d15-a4b1-4a7aef202c2a',
			coffeeId,
			userId,
			main: 4.5,
			strength: 3,
			acidity: 2.5,
			aftertaste: 4,
			createdAt: '2025-11-11T12:00:00.000000Z',
			updatedAt: '2025-11-11T12:05:00.000000Z',
		})

		const res = await GET(context as any)
		expect(res.status).toBe(200)
		expect(res.headers.get('cache-control')).toBe('no-store')
		expect(res.headers.get('x-request-id')).toBe(requestId)
		expect(await res.json()).toEqual({
			id: '5c7b1c9a-0c0f-4d15-a4b1-4a7aef202c2a',
			coffeeId,
			userId,
			main: 4.5,
			strength: 3,
			acidity: 2.5,
			aftertaste: 4,
			createdAt: '2025-11-11T12:00:00.000000Z',
			updatedAt: '2025-11-11T12:05:00.000000Z',
		})
	})
})

describe('PUT /api/coffees/{id}/my-rating', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 401 when access token is missing', async () => {
		const context = makeContext({
			authorization: undefined,
			cookieToken: undefined,
			body: { main: 3, strength: 3, acidity: 3, aftertaste: 3 },
		})

		const res = await PUT(context as any)
		expect(res.status).toBe(401)
		expect(await res.json()).toEqual({
			code: 'unauthorized',
			message: 'Missing access token',
		})
	})

	it('returns 401 when token is invalid', async () => {
		const context = makeContext({
			authorization: 'Bearer badtoken',
			body: { main: 3, strength: 3, acidity: 3, aftertaste: 3 },
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

		const res = await PUT(context as any)
		expect(res.status).toBe(401)
		expect(await res.json()).toEqual({
			code: 'unauthorized',
			message: 'Invalid access token',
		})
	})

	it('returns 400 for invalid coffee id (non-UUID)', async () => {
		const context = makeContext({
			id: 'not-a-uuid',
			authorization: 'Bearer ok',
			body: { main: 3, strength: 3, acidity: 3, aftertaste: 3 },
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: 'e10590bb-e06c-4013-bbbc-c17cff05907d' } },
			error: null,
		})

		const res = await PUT(context as any)
		expect(res.status).toBe(400)
		expect(await res.json()).toEqual({
			code: 'validation_failed',
			message: 'Invalid id',
		})
	})

	it('returns 400 for invalid JSON body', async () => {
		const context = makeContext({
			authorization: 'Bearer ok',
			rawBody: '{not json',
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: 'e10590bb-e06c-4013-bbbc-c17cff05907d' } },
			error: null,
		})

		const res = await PUT(context as any)
		expect(res.status).toBe(400)
		expect(await res.json()).toEqual({
			code: 'validation_failed',
			message: 'Invalid JSON body',
		})
	})

	it('returns 400 for invalid rating payload (not in 0.5 steps)', async () => {
		const context = makeContext({
			authorization: 'Bearer ok',
			body: { main: 1.3, strength: 3, acidity: 3, aftertaste: 3 },
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: 'e10590bb-e06c-4013-bbbc-c17cff05907d' } },
			error: null,
		})

		const res = await PUT(context as any)
		expect(res.status).toBe(400)
		expect(await res.json()).toEqual({
			code: 'validation_failed',
			message: 'Invalid rating payload',
		})
	})

	it('returns 404 when coffee does not exist', async () => {
		const context = makeContext({
			authorization: 'Bearer ok',
			body: { main: 3, strength: 3, acidity: 3, aftertaste: 3 },
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({
			data: { user: { id: 'e10590bb-e06c-4013-bbbc-c17cff05907d' } },
			error: null,
		})
		vi.spyOn(ratingsService, 'findCoffeeById').mockRejectedValueOnce(
			new ratingsService.RatingsServiceError('coffee_not_found', 'Coffee with id X not found')
		)

		const res = await PUT(context as any)
		expect(res.status).toBe(404)
		expect(await res.json()).toEqual({
			code: 'coffee_not_found',
			message: 'Coffee not found',
		})
	})

	it('returns 201 on first-time rating (created_at === updated_at)', async () => {
		const coffeeId = '3b76d2d4-61dd-4dc0-97a2-b94ad4f0fbd9'
		const userId = 'e10590bb-e06c-4013-bbbc-c17cff05907d'

		const context = makeContext({
			id: coffeeId,
			authorization: 'Bearer ok',
			body: { main: 3.5, strength: 4, acidity: 2, aftertaste: 5 },
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: userId } }, error: null })

		vi.spyOn(ratingsService, 'findCoffeeById').mockResolvedValueOnce(undefined)
		vi.spyOn(ratingsService, 'upsertMyRating').mockResolvedValueOnce({
			id: '5c7b1c9a-0c0f-4d15-a4b1-4a7aef202c2a',
			user_id: userId,
			coffee_id: coffeeId,
			main: 7,
			strength: 8,
			acidity: 4,
			aftertaste: 10,
			created_at: '2025-11-11T12:00:00.000000Z',
			updated_at: '2025-11-11T12:00:00.000000Z',
		} as any)

		const res = await PUT(context as any)
		expect(res.status).toBe(201)
		expect(res.headers.get('cache-control')).toBe('no-store')
		expect(await res.json()).toEqual({
			id: '5c7b1c9a-0c0f-4d15-a4b1-4a7aef202c2a',
			coffeeId,
			userId,
			main: 3.5,
			strength: 4,
			acidity: 2,
			aftertaste: 5,
			createdAt: '2025-11-11T12:00:00.000000Z',
			updatedAt: '2025-11-11T12:00:00.000000Z',
		})
	})

	it('returns 200 on rating update (created_at !== updated_at)', async () => {
		const coffeeId = '3b76d2d4-61dd-4dc0-97a2-b94ad4f0fbd9'
		const userId = 'e10590bb-e06c-4013-bbbc-c17cff05907d'

		const context = makeContext({
			id: coffeeId,
			authorization: 'Bearer ok',
			body: { main: 4.5, strength: 3.5, acidity: 1, aftertaste: 2.5 },
		})
		context.locals.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: userId } }, error: null })

		vi.spyOn(ratingsService, 'findCoffeeById').mockResolvedValueOnce(undefined)
		vi.spyOn(ratingsService, 'upsertMyRating').mockResolvedValueOnce({
			id: '5c7b1c9a-0c0f-4d15-a4b1-4a7aef202c2a',
			user_id: userId,
			coffee_id: coffeeId,
			main: 9,
			strength: 7,
			acidity: 2,
			aftertaste: 5,
			created_at: '2025-11-11T12:00:00.000000Z',
			updated_at: '2025-11-11T12:05:00.000000Z',
		} as any)

		const res = await PUT(context as any)
		expect(res.status).toBe(200)
		expect(await res.json()).toMatchObject({
			coffeeId,
			userId,
			main: 4.5,
			strength: 3.5,
			acidity: 1,
			aftertaste: 2.5,
		})
	})
})

