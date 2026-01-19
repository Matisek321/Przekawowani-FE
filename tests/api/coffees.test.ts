import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../../src/pages/api/coffees'
import * as coffeesService from '../../src/lib/services/coffees.service'

type TestContext = {
	request: Request
	url: URL
	locals?: Record<string, unknown>
}

function makeContext(url: string): TestContext {
	const request = new Request(url)
	return {
		request,
		url: new URL(request.url),
		locals: { supabase: {} },
	}
}

describe('GET /api/coffees', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 200 with defaults and payload', async () => {
		vi.spyOn(coffeesService, 'listCoffees').mockResolvedValueOnce({
			items: [
				{
					id: '3b76d2d4-61dd-4dc0-97a2-b94ad4f0fbd9',
					roasteryId: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
					name: 'Kawa A',
					avgMain: 4.5,
					ratingsCount: 10,
					smallSample: false,
					createdAt: '2025-11-11T12:00:00.000000Z',
				},
			],
			total: 1,
		})

		const res = await GET(makeContext('http://localhost/api/coffees') as any)
		expect(res.status).toBe(200)
		expect(res.headers.get('Cache-Control')).toBe('public, max-age=60, stale-while-revalidate=120')

		const body = await res.json()
		expect(body).toEqual({
			page: 1,
			pageSize: 100,
			total: 1,
			items: [
				{
					id: '3b76d2d4-61dd-4dc0-97a2-b94ad4f0fbd9',
					roasteryId: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
					name: 'Kawa A',
					avgMain: 4.5,
					ratingsCount: 10,
					smallSample: false,
					createdAt: '2025-11-11T12:00:00.000000Z',
				},
			],
		})
	})

	it('passes filters to service (roasteryId, q, sort) and supports custom pagination', async () => {
		const spy = vi
			.spyOn(coffeesService, 'listCoffees')
			.mockResolvedValueOnce({ items: [], total: 0 })

		const res = await GET(
			makeContext(
				'http://localhost/api/coffees?page=2&pageSize=5&roasteryId=8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80&q=KAwA%20%C3%93&sort=rating_desc'
			) as any
		)
		expect(res.status).toBe(200)

		expect(spy).toHaveBeenCalledTimes(1)
		const [, params] = spy.mock.calls[0]
		expect(params).toMatchObject({
			page: 2,
			pageSize: 5,
			roasteryId: '8a9f4b56-3d2e-4f5d-9c3a-2b1c4d6e7f80',
			q: 'KAwA Ó',
			sort: 'rating_desc',
		})
	})

	it('returns 400 for invalid sort and includes field errors', async () => {
		const res = await GET(makeContext('http://localhost/api/coffees?sort=foo') as any)
		expect(res.status).toBe(400)

		const body = await res.json()
		expect(body.code).toBe('validation_failed')
		expect(body.message).toBe('Invalid query parameters')
		expect(body.fields).toBeTruthy()
		expect(body.fields.sort?.length).toBeGreaterThan(0)
	})

	it('returns 400 for invalid page and includes field errors', async () => {
		const res = await GET(makeContext('http://localhost/api/coffees?page=0') as any)
		expect(res.status).toBe(400)

		const body = await res.json()
		expect(body.code).toBe('validation_failed')
		expect(body.message).toBe('Invalid query parameters')
		expect(body.fields.page?.length).toBeGreaterThan(0)
	})

	it('returns 500 on service error', async () => {
		vi.spyOn(coffeesService, 'listCoffees').mockRejectedValueOnce(new Error('db down'))

		const res = await GET(makeContext('http://localhost/api/coffees') as any)
		expect(res.status).toBe(500)
		expect(await res.json()).toEqual({
			code: 'server_error',
			message: 'Unexpected server error',
		})
	})
})

