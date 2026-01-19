import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../../src/pages/api/roasteries/[id]/coffees'
import * as roasteriesService from '../../src/lib/services/roasteries.service'
import * as roasteryCoffeesService from '../../src/lib/services/roasteryCoffees.service'
import * as coffeeService from '../../src/lib/services/coffee.service'
import type { CoffeeDto } from '../../src/types'

type TestContext = {
	request: Request
	params?: Record<string, string>
	locals?: Record<string, unknown>
}

/**
 * Creates a mock supabase client with auth.getUser mocked
 */
function createMockSupabase(user: { id: string } | null, error: Error | null = null) {
	return {
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user },
				error,
			}),
		},
	}
}

describe('GET /api/roasteries/{id}/coffees', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 200 with defaults and payload', async () => {
		vi.spyOn(roasteriesService, 'getRoasteryById').mockResolvedValueOnce({
			id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
			name: 'Kawa A',
			city: 'Warszawa',
			createdAt: '2025-11-11T12:00:00.000000Z',
		})
		vi.spyOn(roasteryCoffeesService, 'fetchRoasteryCoffees').mockResolvedValueOnce({
			items: [
				{
					id: 'c1',
					name: 'Ethiopia',
					avgMain: 4.5,
					ratingsCount: 12,
					smallSample: false,
					createdAt: '2025-11-11T12:00:00.000000Z',
				},
			],
			total: 1,
		})

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80/coffees'),
			params: { id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80' },
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(200)
		expect(res.headers.get('X-Request-Id')).toBeNull()

		const body = await res.json()
		expect(body).toEqual({
			page: 1,
			pageSize: 30,
			total: 1,
			items: [
				{
					id: 'c1',
					name: 'Ethiopia',
					avgMain: 4.5,
					ratingsCount: 12,
					smallSample: false,
					createdAt: '2025-11-11T12:00:00.000000Z',
				},
			],
		})
	})

	it('supports custom pagination params', async () => {
		vi.spyOn(roasteriesService, 'getRoasteryById').mockResolvedValueOnce({
			id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
			name: 'Kawa A',
			city: 'Warszawa',
			createdAt: '2025-11-11T12:00:00.000000Z',
		})
		vi.spyOn(roasteryCoffeesService, 'fetchRoasteryCoffees').mockResolvedValueOnce({
			items: [],
			total: 0,
		})

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80/coffees?page=2&pageSize=10'),
			params: { id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80' },
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body).toEqual({
			page: 2,
			pageSize: 10,
			total: 0,
			items: [],
		})
	})

	it('returns 404 when roastery does not exist', async () => {
		vi.spyOn(roasteriesService, 'getRoasteryById').mockResolvedValueOnce(null)

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/coffees'),
			params: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(404)
		const body = await res.json()
		expect(body).toEqual({
			code: 'roastery_not_found',
			message: 'Roastery not found',
		})
	})

	it('returns 400 for invalid UUID', async () => {
		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/not-a-uuid/coffees'),
			params: { id: 'not-a-uuid' },
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body).toEqual({
			code: 'invalid_request',
			message: 'Invalid path params',
		})
	})

	it('returns 400 for invalid pagination', async () => {
		vi.spyOn(roasteriesService, 'getRoasteryById').mockResolvedValueOnce({
			id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
			name: 'Kawa A',
			city: 'Warszawa',
			createdAt: '2025-11-11T12:00:00.000000Z',
		})

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80/coffees?page=0'),
			params: { id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80' },
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body).toEqual({
			code: 'invalid_request',
			message: 'Invalid query params',
		})
	})

	it('returns 500 on service error', async () => {
		vi.spyOn(roasteriesService, 'getRoasteryById').mockResolvedValueOnce({
			id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
			name: 'Kawa A',
			city: 'Warszawa',
			createdAt: '2025-11-11T12:00:00.000000Z',
		})
		vi.spyOn(roasteryCoffeesService, 'fetchRoasteryCoffees').mockRejectedValueOnce(new Error('db down'))

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80/coffees'),
			params: { id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80' },
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(500)
		const body = await res.json()
		expect(body).toEqual({
			code: 'internal_error',
			message: 'Unexpected server error',
		})
	})
})

describe('POST /api/roasteries/{id}/coffees', () => {
	const VALID_ROASTERY_ID = '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80'
	const VALID_USER_ID = 'e10590bb-e06c-4013-bbbc-c17cff05907d'

	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 201 on successful coffee creation', async () => {
		const mockCoffee: CoffeeDto = {
			id: 'coffee-uuid-123',
			roasteryId: VALID_ROASTERY_ID,
			name: 'Ethiopia Yirgacheffe',
			avgMain: null,
			ratingsCount: 0,
			smallSample: true,
			createdAt: '2025-11-11T12:00:00.000000Z',
		}

		vi.spyOn(coffeeService, 'createCoffee').mockResolvedValueOnce(mockCoffee)

		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer valid-token',
				},
				body: JSON.stringify({ name: 'Ethiopia Yirgacheffe' }),
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase({ id: VALID_USER_ID }) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(201)
		const body = await res.json()
		expect(body).toEqual(mockCoffee)
	})

	it('returns 401 when Authorization header is missing', async () => {
		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Ethiopia' }),
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase(null) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(401)
		const body = await res.json()
		expect(body).toEqual({
			code: 'unauthorized',
			message: 'Missing or invalid authorization header',
		})
	})

	it('returns 401 when token is invalid', async () => {
		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer invalid-token',
				},
				body: JSON.stringify({ name: 'Ethiopia' }),
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase(null, new Error('Invalid token')) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(401)
		const body = await res.json()
		expect(body).toEqual({
			code: 'unauthorized',
			message: 'Invalid or expired token',
		})
	})

	it('returns 400 for invalid UUID in path', async () => {
		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/not-a-uuid/coffees', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer valid-token',
				},
				body: JSON.stringify({ name: 'Ethiopia' }),
			}),
			params: { id: 'not-a-uuid' },
			locals: { supabase: createMockSupabase({ id: VALID_USER_ID }) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body).toEqual({
			code: 'validation_failed',
			message: 'Invalid roastery ID format',
		})
	})

	it('returns 400 for empty coffee name', async () => {
		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer valid-token',
				},
				body: JSON.stringify({ name: '' }),
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase({ id: VALID_USER_ID }) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe('validation_failed')
	})

	it('returns 400 for coffee name exceeding 128 characters', async () => {
		const longName = 'A'.repeat(129)

		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer valid-token',
				},
				body: JSON.stringify({ name: longName }),
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase({ id: VALID_USER_ID }) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body.code).toBe('validation_failed')
		expect(body.message).toContain('128')
	})

	it('returns 400 for invalid JSON body', async () => {
		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer valid-token',
				},
				body: 'not valid json',
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase({ id: VALID_USER_ID }) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body).toEqual({
			code: 'validation_failed',
			message: 'Invalid JSON body',
		})
	})

	it('returns 404 when roastery does not exist', async () => {
		vi.spyOn(coffeeService, 'createCoffee').mockRejectedValueOnce(
			new coffeeService.CoffeeServiceError('roastery_not_found', 'Roastery not found')
		)

		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer valid-token',
				},
				body: JSON.stringify({ name: 'Ethiopia' }),
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase({ id: VALID_USER_ID }) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(404)
		const body = await res.json()
		expect(body.code).toBe('roastery_not_found')
	})

	it('returns 409 when coffee name already exists in roastery', async () => {
		vi.spyOn(coffeeService, 'createCoffee').mockRejectedValueOnce(
			new coffeeService.CoffeeServiceError('coffee_duplicate', 'Coffee with name "Ethiopia" already exists')
		)

		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer valid-token',
				},
				body: JSON.stringify({ name: 'Ethiopia' }),
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase({ id: VALID_USER_ID }) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(409)
		const body = await res.json()
		expect(body.code).toBe('coffee_duplicate')
	})

	it('returns 500 on unexpected service error', async () => {
		vi.spyOn(coffeeService, 'createCoffee').mockRejectedValueOnce(new Error('Database connection failed'))

		const context: TestContext = {
			request: new Request(`http://localhost/api/roasteries/${VALID_ROASTERY_ID}/coffees`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer valid-token',
				},
				body: JSON.stringify({ name: 'Ethiopia' }),
			}),
			params: { id: VALID_ROASTERY_ID },
			locals: { supabase: createMockSupabase({ id: VALID_USER_ID }) },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(500)
		const body = await res.json()
		expect(body).toEqual({
			code: 'server_error',
			message: 'Unexpected server error',
		})
	})
})


