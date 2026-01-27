import { useState, useEffect, useCallback } from 'react'
import { useAuthSession } from '@/components/auth/useAuthSession'
import type { ProfileDto } from '@/types'

const ERROR_MESSAGES = {
  profileLoadFailed: 'Nie udało się pobrać danych profilu. Odśwież stronę i spróbuj ponownie.',
  sessionExpired: 'Sesja wygasła. Zaloguj się ponownie.',
  deleteAccountFailed: 'Nie udało się usunąć konta. Spróbuj ponownie później.',
  networkError: 'Błąd połączenia. Sprawdź połączenie internetowe i spróbuj ponownie.',
}

type AccountViewModel = {
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'
  email: string | null
  displayName: string | null
  errorMessage: string | null
}

/**
 * Hook managing the entire account settings view state.
 * Handles profile fetching, logout, and account deletion.
 */
export function useAccountPage() {
  const { userId, accessToken, status, isLoading, isAuthenticated } = useAuthSession()

  // Profile state
  const [profile, setProfile] = useState<ProfileDto | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

  // Action states
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Fetch profile when session is ready
  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated') {
      setIsLoadingProfile(false)
      return
    }

    if (!userId || !accessToken) {
      return
    }

    const fetchProfile = async () => {
      setIsLoadingProfile(true)
      setProfileError(null)

      try {
        // First, get user email from /api/auth/me
        const meResponse = await fetch('/api/auth/me', {
          headers: {
            'Cache-Control': 'no-store',
          },
        })

        if (meResponse.ok) {
          const meData = await meResponse.json().catch(() => null)
          if (meData?.user?.email) {
            setEmail(meData.user.email)
          }
        }

        // Then, fetch the profile
        const profileResponse = await fetch(`/api/profiles/${userId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (profileResponse.ok) {
          const profileData: ProfileDto = await profileResponse.json()
          setProfile(profileData)
        } else if (profileResponse.status === 404) {
          // Profile doesn't exist yet, that's OK
          setProfile(null)
        } else if (profileResponse.status === 401) {
          // Session expired
          setProfileError(ERROR_MESSAGES.sessionExpired)
          window.location.assign('/login?returnTo=/account')
          return
        } else {
          setProfileError(ERROR_MESSAGES.profileLoadFailed)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        setProfileError(ERROR_MESSAGES.networkError)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [status, userId, accessToken])

  // Logout handler
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Redirect regardless of success/failure - user wants to be logged out
      if (response.ok) {
        window.location.assign('/')
      } else {
        console.error('Logout failed, redirecting anyway')
        window.location.assign('/')
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect on error
      window.location.assign('/')
    }
  }, [])

  // Delete account handler
  const handleDeleteAccount = useCallback(async () => {
    if (!accessToken) {
      setDeleteError(ERROR_MESSAGES.sessionExpired)
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Account deleted successfully - redirect to home
        window.location.assign('/')
        return
      }

      if (response.status === 401) {
        setDeleteError(ERROR_MESSAGES.sessionExpired)
        setIsDeleteDialogOpen(false)
        window.location.assign('/login?returnTo=/account')
        return
      }

      // Server error
      setDeleteError(ERROR_MESSAGES.deleteAccountFailed)
    } catch (error) {
      console.error('Delete account error:', error)
      setDeleteError(ERROR_MESSAGES.networkError)
    } finally {
      setIsDeleting(false)
    }
  }, [accessToken])

  // Compute view model status
  const computeViewModelStatus = (): AccountViewModel['status'] => {
    if (isLoading || isLoadingProfile) {
      return 'loading'
    }
    if (profileError) {
      return 'error'
    }
    if (status === 'unauthenticated') {
      return 'unauthenticated'
    }
    return 'authenticated'
  }

  return {
    // View model
    viewModel: {
      status: computeViewModelStatus(),
      email,
      displayName: profile?.displayName || null,
      errorMessage: profileError,
    } as AccountViewModel,
    // Action states
    isLoggingOut,
    isDeleting,
    deleteError,
    // Dialog state
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    // Handlers
    handleLogout,
    handleDeleteAccount,
  }
}
