import { useCallback, useState, useEffect } from 'react'
import { useDisplayNameGate } from '@/components/auth/useDisplayNameGate'
import { useMyRating } from '@/components/coffees/hooks/useMyRating'
import { RateCoffeeForm } from '@/components/coffees/RateCoffeeForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import type { CoffeeDetailDto, MyRatingDto } from '@/types'

// ViewModel types
type CoffeeContextVM = {
  id: string
  name: string
}

type UseCoffeeContextResult = {
  coffee: CoffeeContextVM | null
  isLoading: boolean
  error: string | null
}

/**
 * Maps CoffeeDetailDto to a simpler ViewModel for display context.
 */
function mapCoffeeDtoToContextVM(dto: CoffeeDetailDto): CoffeeContextVM {
  return {
    id: dto.id,
    name: dto.name,
  }
}

/**
 * Hook that fetches coffee data for display context.
 */
function useCoffeeContext(coffeeId: string): UseCoffeeContextResult {
  const [coffee, setCoffee] = useState<CoffeeContextVM | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchCoffee = async () => {
      try {
        const response = await fetch(`/api/coffees/${coffeeId}`)

        if (!isMounted) return

        if (response.status === 404) {
          setError('Kawa nie została znaleziona')
          setIsLoading(false)
          return
        }

        if (!response.ok) {
          setError('Wystąpił błąd podczas pobierania danych kawy')
          setIsLoading(false)
          return
        }

        const data: CoffeeDetailDto = await response.json()
        setCoffee(mapCoffeeDtoToContextVM(data))
        setIsLoading(false)
      } catch (err) {
        if (!isMounted) return
        console.error('Error fetching coffee:', err)
        setError('Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.')
        setIsLoading(false)
      }
    }

    fetchCoffee()

    return () => {
      isMounted = false
    }
  }, [coffeeId])

  return { coffee, isLoading, error }
}

// Component props
type RateCoffeePageProps = {
  coffeeId: string
}

type LoadingStateProps = {
  message?: string
}

type ErrorStateProps = {
  message: string
  coffeeId?: string
  showCoffeeLink?: boolean
}

type CoffeeInfoHeaderProps = {
  coffeeName: string
  coffeeId: string
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
function ErrorState({ message, coffeeId, showCoffeeLink = true }: ErrorStateProps) {
  return (
    <div className="space-y-4">
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      {showCoffeeLink && coffeeId && (
        <p className="text-center text-sm">
          <a
            href={`/coffees/${coffeeId}`}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Wróć do szczegółów kawy
          </a>
        </p>
      )}
      {!coffeeId && (
        <p className="text-center text-sm">
          <a
            href="/coffees"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Wróć do listy kaw
          </a>
        </p>
      )}
    </div>
  )
}

/**
 * Header component displaying coffee info.
 */
function CoffeeInfoHeader({ coffeeName, coffeeId }: CoffeeInfoHeaderProps) {
  return (
    <div className="rounded-md bg-muted p-4">
      <p className="text-sm text-muted-foreground">Oceniasz kawę:</p>
      <a
        href={`/coffees/${coffeeId}`}
        className="font-medium text-primary hover:underline underline-offset-4"
      >
        {coffeeName}
      </a>
    </div>
  )
}

/**
 * Back link component for navigation to coffee details.
 */
function BackLink({ coffeeId }: { coffeeId: string }) {
  return (
    <a
      href={`/coffees/${coffeeId}`}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Powrót do szczegółów kawy
    </a>
  )
}

/**
 * Container component for the "Rate Coffee" page.
 * Handles auth/display_name gate, fetches coffee and existing rating, and renders the form.
 */
export function RateCoffeePage({ coffeeId }: RateCoffeePageProps) {
  const { accessToken, isAllowed, isChecking, isRedirecting, isBlocked, gate } =
    useDisplayNameGate({
      returnTo: `/coffees/${coffeeId}/rate`,
    })

  const { coffee, isLoading: isCoffeeLoading, error: coffeeError } = useCoffeeContext(coffeeId)

  const {
    data: existingRating,
    isLoading: isRatingLoading,
    error: ratingError,
    notFound: noExistingRating,
  } = useMyRating(coffeeId, accessToken)

  const handleSuccess = useCallback(
    (rating: MyRatingDto) => {
      // Redirect to the coffee detail page after successful save
      window.location.assign(`/coffees/${coffeeId}`)
    },
    [coffeeId]
  )

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
          coffeeId={coffeeId}
        />
      </div>
    )
  }

  // Gate not yet passed
  if (!isAllowed) {
    return null
  }

  // Show loading state while fetching coffee data
  if (isCoffeeLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <LoadingState message="Ładowanie danych kawy..." />
      </div>
    )
  }

  // Show error state if coffee fetch failed
  if (coffeeError || !coffee) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <ErrorState message={coffeeError ?? 'Nie udało się załadować danych kawy'} coffeeId={coffeeId} />
      </div>
    )
  }

  // Show loading state while fetching existing rating
  if (isRatingLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <BackLink coffeeId={coffeeId} />
        <div className="mt-6">
          <LoadingState message="Sprawdzanie istniejącej oceny..." />
        </div>
      </div>
    )
  }

  // Show error if rating fetch failed (but not 204 no content)
  if (ratingError && !noExistingRating) {
    // 401 error - let the gate handle redirect
    if (ratingError.code === 'unauthorized') {
      return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <ErrorState message={ratingError.message} coffeeId={coffeeId} />
        </div>
      )
    }

    // Other errors - show error state
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <ErrorState message={ratingError.message} coffeeId={coffeeId} />
      </div>
    )
  }

  const isEditing = existingRating !== null

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <BackLink coffeeId={coffeeId} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isEditing ? 'Edytuj ocenę' : 'Oceń kawę'}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Zmień swoją ocenę kawy. Wszystkie pola są wymagane.'
              : 'Wystaw ocenę kawy w skali 1-5. Wszystkie pola są wymagane.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Coffee context */}
          <CoffeeInfoHeader coffeeName={coffee.name} coffeeId={coffee.id} />

          {/* Rating form */}
          {accessToken && (
            <RateCoffeeForm
              coffeeId={coffeeId}
              coffeeName={coffee.name}
              accessToken={accessToken}
              existingRating={existingRating}
              onSuccess={handleSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
