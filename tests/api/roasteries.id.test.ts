import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../src/pages/api/roasteries/[id]'
import * as roasteriesService from '../../src/lib/services/roasteries.service'

type TestContext = {
	request: Request
	params?: Record<string, string>
	locals?: Record<string, unknown>
}

describe('GET /api/roasteries/{id}', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 200 with roastery payload when found', async () => {
		vi.spyOn(roasteriesService, 'getRoasteryById').mockResolvedValueOnce({
			id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
			name: 'Kawa A',
			city: 'Warszawa',
			createdAt: '2025-11-11T12:00:00.000000Z',
		})

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80'),
			params: { id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80' },
			locals: { supabase: {} },
		}

		const res = await GET(context as any)
		expect(res.status).toBe(200)
		expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, stale-while-revalidate=120')
		expect(res.headers.get('X-Request-Id')).toBeNull()

		const body = await res.json()
		expect(body).toEqual({
			id: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
			name: 'Kawa A',
			city: 'Warszawa',
			createdAt: '2025-11-11T12:00:00.000000Z',
		})
	})

	it('returns 404 when roastery does not exist', async () => {
		vi.spyOn(roasteriesService, 'getRoasteryById').mockResolvedValueOnce(null)

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
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
			request: new Request('http://localhost/api/roasteries/not-a-uuid'),
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

	it('returns 500 on service error', async () => {
		vi.spyOn(roasteriesService, 'getRoasteryById').mockRejectedValueOnce(new Error('db down'))

		const context: TestContext = {
			request: new Request('http://localhost/api/roasteries/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
			params: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
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


