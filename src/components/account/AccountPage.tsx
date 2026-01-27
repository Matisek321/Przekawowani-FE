import { useEffect } from 'react'
import { useAccountPage } from './useAccountPage'
import { ProfileSection } from './ProfileSection'
import { SessionSection } from './SessionSection'
import { DangerZone } from './DangerZone'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'

/**
 * Main container component for the account settings view.
 * Manages loading states, errors, and renders account sections.
 */
export function AccountPage() {
  const {
    viewModel,
    isLoggingOut,
    isDeleting,
    deleteError,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    handleLogout,
    handleDeleteAccount,
  } = useAccountPage()

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (viewModel.status === 'unauthenticated') {
      window.location.assign('/login?returnTo=/account')
    }
  }, [viewModel.status])

  // Loading state
  if (viewModel.status === 'loading') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Ustawienia konta</h1>
        <div className="space-y-6">
          {/* Profile skeleton */}
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Ładowanie profilu...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Unauthenticated state (will redirect)
  if (viewModel.status === 'unauthenticated') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Przekierowuję do logowania...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (viewModel.status === 'error') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Ustawienia konta</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {viewModel.errorMessage || 'Wystąpił nieoczekiwany błąd'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Authenticated state - render account settings
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Ustawienia konta</h1>

      <div className="space-y-6">
        {/* Profile section */}
        <ProfileSection
          email={viewModel.email || ''}
          displayName={viewModel.displayName}
        />

        {/* Session section */}
        <SessionSection
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        {/* Danger zone */}
        <DangerZone
          onDeleteAccount={handleDeleteAccount}
          isDeleting={isDeleting}
          deleteError={deleteError}
          isDeleteDialogOpen={isDeleteDialogOpen}
          onDeleteDialogOpenChange={setIsDeleteDialogOpen}
        />
      </div>
    </div>
  )
}
