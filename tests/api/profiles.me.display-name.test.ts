import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../src/pages/api/profiles/me/display-name'
import * as profileService from '../../src/lib/services/profile.service'
import type { ProfileDto } from '../../src/types'

type TestContext = {
	request: Request
	locals?: Record<string, unknown>
}

describe('POST /api/profiles/me/display-name (no auth)', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
	})

	it('returns 400 for invalid displayName', async () => {
		const context: TestContext = {
			request: new Request('http://localhost/api/profiles/me/display-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: '' }),
			}),
			locals: { supabase: {} },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(400)
		const body = await res.json()
		expect(body).toEqual({
			code: 'validation_failed',
			message: 'Invalid displayName format',
		})
	})

	it('returns 201 on first-time set', async () => {
		const dto: ProfileDto = {
			userId: 'e10590bb-e06c-4013-bbbc-c17cff05907d',
			displayName: 'Jan Kowalski',
			createdAt: '2025-11-11T12:00:00.000000Z',
		}
		vi.spyOn(profileService, 'setDisplayNameOnce').mockResolvedValueOnce(dto)

		const context: TestContext = {
			request: new Request('http://localhost/api/profiles/me/display-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: 'Jan Kowalski' }),
			}),
			locals: { supabase: {} },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(201)
		const body = await res.json()
		expect(body).toEqual(dto)
	})

	it('returns 409 when display name already set', async () => {
		vi.spyOn(profileService, 'setDisplayNameOnce').mockRejectedValueOnce({ code: 'display_name_already_set' })

		const context: TestContext = {
			request: new Request('http://localhost/api/profiles/me/display-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: 'Someone' }),
			}),
			locals: { supabase: {} },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(409)
		const body = await res.json()
		expect(body).toEqual({
			code: 'display_name_already_set',
			message: 'Display name already set',
		})
	})

	it('returns 409 on unique conflict (normalized_display_name)', async () => {
		vi.spyOn(profileService, 'setDisplayNameOnce').mockRejectedValueOnce({ code: '23505' })

		const context: TestContext = {
			request: new Request('http://localhost/api/profiles/me/display-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: 'Taken Name' }),
			}),
			locals: { supabase: {} },
		}

		const res = await POST(context as any)
		expect(res.status).toBe(409)
		const body = await res.json()
		expect(body).toEqual({
			code: 'display_name_conflict',
			message: 'Display name already taken',
		})
	})

	it('returns 500 on unexpected error', async () => {
		vi.spyOn(profileService, 'setDisplayNameOnce').mockRejectedValueOnce(new Error('boom'))

		const context: TestContext = {
			request: new Request('http://localhost/api/profiles/me/display-name', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ displayName: 'User' }),
			}),
			locals: { supabase: {} },
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


