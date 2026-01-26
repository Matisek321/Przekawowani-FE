import type { APIRoute } from 'astro'
import { json, jsonUnauthorized } from '../../../lib/http'

export const prerender = false

export const GET: APIRoute = async (context) => {
  const { user, session } = context.locals

  if (!user || !session) {
    return jsonUnauthorized('unauthorized', 'Authentication required')
  }

  return json({
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    session: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? null,
    },
  })
}
