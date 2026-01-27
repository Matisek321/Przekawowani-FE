import { useState, useEffect, useCallback } from 'react'
import { useAuthSession } from '@/components/auth/useAuthSession'
import { SetDisplayNameForm } from '@/components/account/SetDisplayNameForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, Loader2, AlertCircle } from 'lucide-react'
import type { ProfileDto } from '@/types'

type SetDisplayNamePageProps = {
  returnTo?: string
}

/**
 * Container component for the "Set Display Name" page.
 * Checks if user already has display_name set and redirects if so.
 * Otherwise renders the form for setting display_name.
 */
export function SetDisplayNamePage({ returnTo }: SetDisplayNamePageProps) {
  const { userId, accessToken, isLoading, isAuthenticated, status } = useAuthSession()
  
  const [isCheckingProfile, setIsCheckingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Check if user already has display_name set
  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated') {
      // Redirect to login
      const loginUrl = returnTo 
        ? `/login?returnTo=${encodeURIComponent(`/account/display-name?returnTo=${encodeURIComponent(returnTo)}`)}`
        : '/login?returnTo=/account/display-name'
      window.location.assign(loginUrl)
      return
    }

    if (!userId || !accessToken) {
      return
    }

    const checkProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${userId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const profile: ProfileDto = await response.json()
          
          if (profile.displayName !== null) {
            // User already has display_name set, redirect
            setIsRedirecting(true)
            window.location.assign(returnTo ?? '/')
            return
          }
        }
        
        // Profile not found (404) or displayName is null - allow setting
        setIsCheckingProfile(false)
      } catch (error) {
        console.error('Error checking profile:', error)
        setProfileError('Nie udało się sprawdzić profilu. Odśwież stronę i spróbuj ponownie.')
        setIsCheckingProfile(false)
      }
    }

    checkProfile()
  }, [status, userId, accessToken, returnTo])

  const handleSuccess = useCallback((_profile: ProfileDto) => {
    setIsRedirecting(true)
    window.location.assign(returnTo ?? '/')
  }, [returnTo])

  // Show loading while checking auth session
  if (isLoading) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Sprawdzanie sesji...</p>
        </div>
      </div>
    )
  }

  // Show loading while checking profile
  if (isCheckingProfile && isAuthenticated) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Sprawdzanie profilu...</p>
        </div>
      </div>
    )
  }

  // Show redirecting state
  if (isRedirecting) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Przekierowuję...</p>
        </div>
      </div>
    )
  }

  // Show error if profile check failed
  if (profileError) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{profileError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Not authenticated - will redirect in useEffect
  if (!isAuthenticated || !accessToken) {
    return null
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Ustaw nazwę wyświetlaną</CardTitle>
          <CardDescription>
            Wybierz swoją publiczną nazwę, która będzie widoczna dla innych użytkowników.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* One-time setting info banner */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Uwaga:</strong> Nazwa wyświetlana może być ustawiona tylko raz i nie można jej później zmienić.
              Upewnij się, że wybrana nazwa jest poprawna.
            </AlertDescription>
          </Alert>

          {/* Display name form */}
          <SetDisplayNameForm
            accessToken={accessToken}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  )
}
