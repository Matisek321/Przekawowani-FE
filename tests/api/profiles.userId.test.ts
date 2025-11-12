import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ProfileDto } from '../../src/types'
import * as profileService from '../../src/lib/services/profile.service'
import { GET } from '../../src/pages/api/profiles/[userId]'

type TestContext = {
  params?: Record<string, string>
  locals?: Record<string, unknown>
}

describe('GET /api/profiles/{userId}', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for invalid uuid', async () => {
    const context: TestContext = {
      params: { userId: 'not-a-uuid' },
      locals: { supabase: {} },
    }

    const res = await GET(context as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({
      code: 'invalid_request',
      message: 'userId must be a valid UUID',
    })
  })

  it('returns 404 when profile not found', async () => {
    vi.spyOn(profileService, 'getPublicProfileByUserId').mockResolvedValueOnce(null)

    const context: TestContext = {
      params: { userId: '11111111-1111-1111-1111-111111111111' },
      locals: { supabase: {} },
    }

    const res = await GET(context as any)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({
      code: 'profile_not_found',
      message: 'Profile not found',
    })
  })

  it('returns 200 with profile payload', async () => {
    const dto: ProfileDto = {
      userId: '22222222-2222-2222-2222-222222222222',
      displayName: 'Jane Doe',
      createdAt: '2025-11-11T12:00:00.000000Z',
    }
    vi.spyOn(profileService, 'getPublicProfileByUserId').mockResolvedValueOnce(dto)

    const context: TestContext = {
      params: { userId: dto.userId },
      locals: { supabase: {} },
    }

    const res = await GET(context as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(dto)
  })
})


