import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

type AuthSessionState = {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  userId: string | null
  accessToken: string | null
}

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_KEY

/**
 * Hook to manage Supabase auth session in client-side React components.
 * Provides userId and accessToken for API calls.
 */
export function useAuthSession() {
  const [state, setState] = useState<AuthSessionState>({
    status: 'loading',
    userId: null,
    accessToken: null,
  })

  const checkSession = useCallback(async () => {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
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
      } else {
        setState({
          status: 'unauthenticated',
          userId: null,
          accessToken: null,
        })
      }
    } catch (error) {
      console.error('Error checking session:', error)
      setState({
        status: 'unauthenticated',
        userId: null,
        accessToken: null,
      })
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  return {
    ...state,
    isLoading: state.status === 'loading',
    isAuthenticated: state.status === 'authenticated',
  }
}
