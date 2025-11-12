import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../src/pages/api/roasteries/[id]/coffees'
import * as roasteriesService from '../../src/lib/services/roasteries.service'
import * as roasteryCoffeesService from '../../src/lib/services/roasteryCoffees.service'

type TestContext = {
	request: Request
	params?: Record<string, string>
	locals?: Record<string, unknown>
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


