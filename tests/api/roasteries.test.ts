import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../src/pages/api/roasteries'
import * as roasteriesService from '../../src/lib/services/roasteries.service'

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
		expect(res.headers.get('X-Request-Id')).toBeTruthy()

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


