import { useCallback, useState, useEffect } from 'react'
import { useDisplayNameGate } from '@/components/auth/useDisplayNameGate'
import { CreateCoffeeForm } from '@/components/roasteries/coffee/CreateCoffeeForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, Loader2, AlertCircle } from 'lucide-react'
import type { CoffeeDto, RoasteryDto } from '@/types'

// ViewModel types
type RoasteryContextVM = {
  id: string
  name: string
  city: string
}

type UseRoasteryContextResult = {
  roastery: RoasteryContextVM | null
  isLoading: boolean
  error: string | null
}

/**
 * Maps RoasteryDto to a simpler ViewModel for display context.
 */
function mapRoasteryDtoToContextVM(dto: RoasteryDto): RoasteryContextVM {
  return {
    id: dto.id,
    name: dto.name,
    city: dto.city,
  }
}

/**
 * Hook that fetches roastery data for display context.
 */
function useRoasteryContext(roasteryId: string): UseRoasteryContextResult {
  const [roastery, setRoastery] = useState<RoasteryContextVM | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchRoastery = async () => {
      try {
        const response = await fetch(`/api/roasteries/${roasteryId}`)

        if (!isMounted) return

        if (response.status === 404) {
          setError('Palarnia nie została znaleziona')
          setIsLoading(false)
          return
        }

        if (!response.ok) {
          setError('Wystąpił błąd podczas pobierania danych palarni')
          setIsLoading(false)
          return
        }

        const data: RoasteryDto = await response.json()
        setRoastery(mapRoasteryDtoToContextVM(data))
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return
        console.error('Error fetching roastery:', err)
        setError('Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.')
        setIsLoading(false)
      }
    }

    fetchRoastery()

    return () => {
      isMounted = false
    }
  }, [roasteryId])

  return { roastery, isLoading, error }
}

// Component props
type CreateCoffeePageProps = {
  roasteryId: string
}

type LoadingStateProps = {
  message?: string
}

type ErrorStateProps = {
  message: string
  roasteryId?: string
}

type RoasteryContextProps = {
  roastery: RoasteryContextVM
}

/**
 * Loading state component displayed during gate checking or data fetching.
 */
function LoadingState({ message = 'Ładowanie...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

/**
 * Error state component displayed when gate is blocked or an error occurred.
 */
function ErrorState({ message, roasteryId }: ErrorStateProps) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      {roasteryId && (
        <p className="text-center text-sm">
          <a href={`/roasteries/${roasteryId}`} className="text-primary underline underline-offset-4 hover:text-primary/80">
            Wróć do palarni
          </a>
        </p>
      )}
      {!roasteryId && (
        <p className="text-center text-sm">
          <a href="/roasteries" className="text-primary underline underline-offset-4 hover:text-primary/80">
            Wróć do listy palarni
          </a>
        </p>
      )}
    </div>
  )
}

/**
 * Roastery context component displaying which roastery the coffee is being added to.
 */
function RoasteryContext({ roastery }: RoasteryContextProps) {
  return (
    <div className="rounded-md bg-muted p-4">
      <p className="text-sm text-muted-foreground">Palarnia:</p>
      <p className="font-medium">
        {roastery.name} <span className="text-muted-foreground">({roastery.city})</span>
      </p>
    </div>
  )
}

/**
 * Container component for the "Add Coffee" page.
 * Handles auth/display_name gate, fetches roastery context, and renders the form.
 */
export function CreateCoffeePage({ roasteryId }: CreateCoffeePageProps) {
  const { accessToken, isAllowed, isChecking, isRedirecting, isBlocked, gate } =
    useDisplayNameGate({
      returnTo: `/roasteries/${roasteryId}/coffees/new`,
    })

  const { roastery, isLoading: isRoasteryLoading, error: roasteryError } = useRoasteryContext(roasteryId)

  const handleSuccess = useCallback((created: CoffeeDto) => {
    // Redirect to the created coffee's detail page
    window.location.assign(`/coffees/${created.id}`)
  }, [])

  // Show loading state while checking gate
  if (isChecking || isRedirecting) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <LoadingState message={isRedirecting ? 'Przekierowuję...' : 'Sprawdzanie dostępu...'} />
      </div>
    )
  }

  // Show error state if gate is blocked
  if (isBlocked) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <ErrorState
          message={
            gate.reason === 'error'
              ? 'Wystąpił błąd podczas sprawdzania dostępu. Odśwież stronę i spróbuj ponownie.'
              : 'Nie masz dostępu do tej strony.'
          }
          roasteryId={roasteryId}
        />
      </div>
    )
  }

  // Gate not yet passed
  if (!isAllowed) {
    return null
  }

  // Show loading state while fetching roastery
  if (isRoasteryLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <LoadingState message="Ładowanie danych palarni..." />
      </div>
    )
  }

  // Show error state if roastery fetch failed
  if (roasteryError || !roastery) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <ErrorState message={roasteryError ?? 'Nie udało się załadować danych palarni'} />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Dodaj kawę</CardTitle>
          <CardDescription>
            Wprowadź nazwę nowej kawy dla wybranej palarni.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Roastery context */}
          <RoasteryContext roastery={roastery} />

          {/* MVP info banner */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              W wersji MVP nie można edytować ani usuwać kawy po jej utworzeniu.
              Upewnij się, że wprowadzone dane są poprawne.
            </AlertDescription>
          </Alert>

          {/* Coffee creation form */}
          {accessToken && (
            <CreateCoffeeForm
              roasteryId={roasteryId}
              accessToken={accessToken}
              onSuccess={handleSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
