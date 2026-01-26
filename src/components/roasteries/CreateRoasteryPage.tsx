import { useCallback } from 'react'
import { useDisplayNameGate } from '@/components/auth/useDisplayNameGate'
import { useAuthSession } from '@/components/auth/useAuthSession'
import { CreateRoasteryForm } from '@/components/roasteries/CreateRoasteryForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, Loader2 } from 'lucide-react'
import type { RoasteryDto } from '@/types'

/**
 * Container component for the "Add Roastery" page.
 * Handles auth/display_name gate and renders the form.
 */
export function CreateRoasteryPage() {
  const { accessToken } = useAuthSession()
  const { isAllowed, isChecking, isRedirecting, isBlocked, gate } = useDisplayNameGate({
    returnTo: '/roasteries/new',
  })

  const handleSuccess = useCallback((created: RoasteryDto) => {
    // Redirect to the created roastery's detail page
    window.location.assign(`/roasteries/${created.id}`)
  }, [])

  // Show loading state while checking gate
  if (isChecking || isRedirecting) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">
            {isRedirecting ? 'Przekierowuję...' : 'Sprawdzanie dostępu...'}
          </p>
        </div>
      </div>
    )
  }

  // Show error state if blocked
  if (isBlocked) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            {gate.reason === 'error'
              ? 'Wystąpił błąd podczas sprawdzania dostępu. Odśwież stronę i spróbuj ponownie.'
              : 'Nie masz dostępu do tej strony.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Gate passed - render content
  if (!isAllowed) {
    return null
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Dodaj palarnię</CardTitle>
          <CardDescription>
            Wprowadź dane nowej palarni kawy. Wszystkie pola są wymagane.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MVP info banner */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              W wersji MVP nie można edytować ani usuwać palarni po jej utworzeniu.
              Upewnij się, że wprowadzone dane są poprawne.
            </AlertDescription>
          </Alert>

          {/* Roastery creation form */}
          {accessToken && (
            <CreateRoasteryForm
              accessToken={accessToken}
              onSuccess={handleSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
