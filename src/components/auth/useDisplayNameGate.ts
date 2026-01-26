import { useState, useEffect } from 'react'
import { useAuthSession } from './useAuthSession'
import type { ProfileDto } from '@/types'

type GateDecision = {
  status: 'checking' | 'allowed' | 'redirecting' | 'blocked'
  reason?: 'unauthenticated' | 'display_name_missing' | 'error'
}

type UseDisplayNameGateOptions = {
  returnTo: string
}

/**
 * Hook that checks if the user is authenticated and has a display name set.
 * Redirects to appropriate pages if conditions are not met.
 */
export function useDisplayNameGate({ returnTo }: UseDisplayNameGateOptions) {
  const { status, userId, accessToken, isLoading } = useAuthSession()
  const [gate, setGate] = useState<GateDecision>({ status: 'checking' })
  const [profile, setProfile] = useState<ProfileDto | null>(null)

  useEffect(() => {
    // Still loading auth session
    if (isLoading) {
      return
    }

    // Not authenticated - redirect to login
    if (status === 'unauthenticated') {
      setGate({ status: 'redirecting', reason: 'unauthenticated' })
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }

    // Authenticated - check for display name
    if (status === 'authenticated' && userId && accessToken) {
      checkDisplayName(userId, accessToken)
    }
  }, [status, userId, accessToken, isLoading, returnTo])

  const checkDisplayName = async (userId: string, accessToken: string) => {
    try {
      const response = await fetch(`/api/profiles/${userId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.status === 404) {
        // Profile not found - redirect to set display name
        setGate({ status: 'redirecting', reason: 'display_name_missing' })
        window.location.assign(`/account/display-name?returnTo=${encodeURIComponent(returnTo)}`)
        return
      }

      if (!response.ok) {
        setGate({ status: 'blocked', reason: 'error' })
        return
      }

      const profileData: ProfileDto = await response.json()
      setProfile(profileData)

      if (profileData.displayName === null) {
        // Display name not set - redirect to set it
        setGate({ status: 'redirecting', reason: 'display_name_missing' })
        window.location.assign(`/account/display-name?returnTo=${encodeURIComponent(returnTo)}`)
        return
      }

      // All conditions met - allow access
      setGate({ status: 'allowed' })
    } catch (error) {
      console.error('Error checking display name:', error)
      setGate({ status: 'blocked', reason: 'error' })
    }
  }

  return {
    gate,
    profile,
    userId,
    accessToken,
    isAuthenticated: status === 'authenticated',
    isAllowed: gate.status === 'allowed',
    isChecking: gate.status === 'checking',
    isRedirecting: gate.status === 'redirecting',
    isBlocked: gate.status === 'blocked',
  }
}
