import { useState, useEffect, useCallback, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/db/supabase.client'

type AuthSessionState = {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  userId: string | null
  accessToken: string | null
}

/**
 * Hook to manage Supabase auth session in client-side React components.
 * Provides userId and accessToken for API calls.
 */
export function useAuthSession() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [state, setState] = useState<AuthSessionState>({
    status: 'loading',
    userId: null,
    accessToken: null,
  })

  const checkSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
        setState({
          status: 'unauthenticated',
          userId: null,
          accessToken: null,
        })
        return
      }

      if (session?.user) {
        setState({
          status: 'authenticated',
          userId: session.user.id,
          accessToken: session.access_token,
        })
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Cache-Control': 'no-store',
        },
      })

      if (response.ok) {
        const data = await response.json().catch(() => null)

        if (
          data?.user?.id &&
          data?.session?.accessToken &&
          data?.session?.refreshToken
        ) {
          await supabase.auth.setSession({
            access_token: data.session.accessToken,
            refresh_token: data.session.refreshToken,
          })

          setState({
            status: 'authenticated',
            userId: data.user.id,
            accessToken: data.session.accessToken,
          })
          return
        }
      }

      setState({
        status: 'unauthenticated',
        userId: null,
        accessToken: null,
      })
    } catch (error) {
      console.error('Error checking session:', error)
      setState({
        status: 'unauthenticated',
        userId: null,
        accessToken: null,
      })
    }
  }, [supabase])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  return {
    ...state,
    isLoading: state.status === 'loading',
    isAuthenticated: state.status === 'authenticated',
  }
}
