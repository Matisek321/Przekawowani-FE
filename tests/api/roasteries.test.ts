import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../../src/pages/api/roasteries'
import * as roasteriesService from '../../src/lib/services/roasteries.service'
import type { RoasteryDto } from '../../src/types'

type TestContext = {
	request: Request
	locals?: Record<string, unknown>
}

describe('GET /api/roasteries', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 200 with defaults and payload', async () => {
		vi.spyOn(roasteriesService, 'listRoasteries').mockResolvedValueOnce({
			items: [
				{ id: '1', name: 'Kawa A', city: 'Warszawa', createdAt: '2025-11-11T12:00:00.000000Z' },
				{ id: '2', name: 'Kawa B', city: 'Kraków', createdAt: '2025-11-11T12:00:00.000000Z' },
			],
			total: 2,
		})

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries'),
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(200)
		expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, stale-while-revalidate=120')
		expect(res.headers.get('X-Request-Id')).toBeNull()

		const body = await res.json()
		expect(body).toEqual({
			page: 1,
			pageSize: 20,
			total: 2,
			items: [
				{ id: '1', name: 'Kawa A', city: 'Warszawa', createdAt: '2025-11-11T12:00:00.000000Z' },
				{ id: '2', name: 'Kawa B', city: 'Kraków', createdAt: '2025-11-11T12:00:00.000000Z' },
			],
		})
	})

	it('returns 400 for invalid page', async () => {
		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries?page=0'),
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body).toEqual({
			code: 'invalid_request',
			message: 'Invalid query',
		})
	})

	it('normalizes q and city before querying service', async () => {
		const spy = vi
			.spyOn(roasteriesService, 'listRoasteries')
			.mockImplementationOnce(async (_client, _params) => ({ items: [], total: 0 }))

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries?q=KAwA%20%C3%81&city=Kielc%C3%A9'),
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(200)

		expect(spy).toHaveBeenCalledTimes(1)
		const [, params] = spy.mock.calls[0]
		expect(params).toMatchObject({
			qNorm: 'kawa a',
			cityNorm: 'kielce',
			page: 1,
			pageSize: 20,
		})
	})
})

describe('POST /api/roasteries', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 401 when unauthenticated', async () => {
		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Coffee', city: 'Gdansk' }),
			}),
			locals: {
				supabase: {
					auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
				},
			},
		}

		const res = await POST(context as any)
		expect(res.status).toBe(401)
		const body = await res.json()
		expect(body).toEqual({
			code: 'unauthorized',
			message: 'Authentication required',
		})
	})

	it('returns 400 for invalid payload', async () => {
		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: '', city: '' }),
			}),
			locals: {
				supabase: {
					auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
				},
			},
		}

		const res = await POST(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body).toEqual({
			code: 'validation_failed',
			message: 'Invalid payload',
		})
	})

	it('returns 201 with created roastery and Location header', async () => {
		const dto: RoasteryDto = {
			id: '5d2d0d56-7f8d-4d98-b186-10219fd3dfb0',
			name: 'Coffee Lab',
			city: 'Poznan',
			createdAt: '2025-11-11T12:00:00.000000Z',
		}
		vi.spyOn(roasteriesService, 'createRoastery').mockResolvedValueOnce(dto)

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Coffee Lab', city: 'Poznan' }),
			}),
			locals: {
				supabase: {
					auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
				},
			},
		}

		const res = await POST(context as any)
		expect(res.status).toBe(201)
		expect(res.headers.get('Location')).toBe(`/api/roasteries/${dto.id}`)
		const body = await res.json()
		expect(body).toEqual(dto)
	})

	it('returns 409 for duplicate roastery', async () => {
		vi.spyOn(roasteriesService, 'createRoastery').mockRejectedValueOnce({ code: 'roastery_duplicate' })

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Coffee Lab', city: 'Poznan' }),
			}),
			locals: {
				supabase: {
					auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
				},
			},
		}

		const res = await POST(context as any)
		expect(res.status).toBe(409)
		const body = await res.json()
		expect(body).toEqual({
			code: 'roastery_duplicate',
			message: 'Roastery already exists',
		})
	})

	it('returns 500 on unexpected error', async () => {
		vi.spyOn(roasteriesService, 'createRoastery').mockRejectedValueOnce(new Error('boom'))

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Coffee Lab', city: 'Poznan' }),
			}),
			locals: {
				supabase: {
					auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
				},
			},
		}

		const res = await POST(context as any)
		expect(res.status).toBe(500)
		const body = await res.json()
		expect(body).toEqual({
			code: 'internal_error',
			message: 'Unexpected server error',
		})
	})
})


