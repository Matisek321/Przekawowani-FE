import { memo, useCallback, useState } from 'react'
import { useAuthSession } from '@/components/auth/useAuthSession'
import { useCoffeeDetail, type CoffeeDetailVM, type ApiErrorState } from './hooks/useCoffeeDetail'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RatingBadge, SmallSampleBadge } from './shared'
import { Loader2, AlertCircle, ArrowLeft, ExternalLink, Star } from 'lucide-react'

// ============================================================================
// Sub-components
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Ładowanie szczegółów kawy...</p>
    </div>
  )
}

type ErrorBannerProps = {
  error: ApiErrorState
  onRetry?: () => void
  showBackLink?: boolean
}

function ErrorBanner({ error, onRetry, showBackLink }: ErrorBannerProps) {
  const is404 = error.code === 'coffee_not_found'

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{error.message}</span>
        <div className="flex gap-2">
          {(showBackLink || is404) && (
            <Button variant="outline" size="sm" asChild>
              <a href="/coffees">Powrót do listy kaw</a>
            </Button>
          )}
          {onRetry && !is404 && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Spróbuj ponownie
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

function BackLink() {
  return (
    <a
      href="/coffees"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Powrót do listy kaw
    </a>
  )
}

type CoffeeHeaderProps = {
  coffee: CoffeeDetailVM
}

function CoffeeHeader({ coffee }: CoffeeHeaderProps) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold sm:text-3xl">{coffee.name}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <RatingBadge value={coffee.avgMain} size="lg" />
        {coffee.smallSample && <SmallSampleBadge />}
        <span className="text-sm text-muted-foreground">
          {formatRatingsCount(coffee.ratingsCount)}
        </span>
      </div>
    </div>
  )
}

type RoasteryInfoProps = {
  coffee: CoffeeDetailVM
}

function RoasteryInfo({ coffee }: RoasteryInfoProps) {
  if (!coffee.roasteryName) {
    return null
  }

  return (
    <div className="space-y-1">
      <h2 className="text-sm font-medium text-muted-foreground">Palarnia</h2>
      <a
        href={coffee.roasteryHref}
        className="inline-flex items-center gap-1 text-base font-medium hover:text-primary transition-colors"
      >
        {coffee.roasteryName}
        {coffee.roasteryCity && (
          <span className="text-muted-foreground font-normal">
            , {coffee.roasteryCity}
          </span>
        )}
        <ExternalLink className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
      </a>
    </div>
  )
}

type MetricDisplayProps = {
  label: string
  value: number | null
  showBar?: boolean
}

const MetricDisplay = memo(function MetricDisplay({ label, value, showBar = true }: MetricDisplayProps) {
  const displayValue = value !== null ? value.toFixed(1) : 'Brak danych'
  const percentage = value !== null ? ((value - 1) / 4) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm font-semibold ${value === null ? 'text-muted-foreground' : ''}`}>
          {displayValue}
        </span>
      </div>
      {showBar && value !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  )
})

type MetricsSectionProps = {
  avgMain: number | null
}

function MetricsSection({ avgMain }: MetricsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5" />
          Metryki oceny
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricDisplay label="Ocena główna" value={avgMain} />
        <p className="text-xs text-muted-foreground italic">
          Szczegółowe metryki (moc, kwasowość, posmak) będą dostępne wkrótce.
        </p>
      </CardContent>
    </Card>
  )
}

type RateCoffeeButtonProps = {
  coffeeId: string
}

function RateCoffeeButton({ coffeeId }: RateCoffeeButtonProps) {
  const { isAuthenticated, isLoading: isAuthLoading, userId, accessToken } = useAuthSession()
  const [isCheckingProfile, setIsCheckingProfile] = useState(false)

  const handleClick = useCallback(async () => {
    const rateUrl = `/coffees/${coffeeId}/rate`

    if (!isAuthenticated) {
      // Not authenticated - redirect to login
      window.location.assign(`/login?returnTo=${encodeURIComponent(rateUrl)}`)
      return
    }

    // Authenticated - check for display_name before redirecting
    if (!userId || !accessToken) {
      window.location.assign(`/login?returnTo=${encodeURIComponent(rateUrl)}`)
      return
    }

    setIsCheckingProfile(true)

    try {
      const response = await fetch(`/api/profiles/${userId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.status === 404) {
        // Profile not found - redirect to set display name
        window.location.assign(`/account/display-name?returnTo=${encodeURIComponent(rateUrl)}`)
        return
      }

      if (!response.ok) {
        // Error fetching profile - let the rate page handle it
        window.location.assign(rateUrl)
        return
      }

      const profile = await response.json()

      if (profile.displayName === null) {
        // Display name not set - redirect to set it
        window.location.assign(`/account/display-name?returnTo=${encodeURIComponent(rateUrl)}`)
        return
      }

      // All conditions met - navigate to rate page
      window.location.assign(rateUrl)
    } catch (error) {
      console.error('[RateCoffeeButton] Error checking profile:', error)
      // On error, let the rate page handle the check
      window.location.assign(rateUrl)
    } finally {
      setIsCheckingProfile(false)
    }
  }, [coffeeId, isAuthenticated, userId, accessToken])

  // Don't render while auth is loading
  if (isAuthLoading || isCheckingProfile) {
    return (
      <Button disabled className="w-full sm:w-auto">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {isCheckingProfile ? 'Sprawdzanie...' : 'Ładowanie...'}
      </Button>
    )
  }

  return (
    <Button onClick={handleClick} size="lg" className="w-full sm:w-auto">
      <Star className="h-4 w-4 mr-2" />
      Oceń tę kawę
    </Button>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatRatingsCount(count: number): string {
  if (count === 0) {
    return 'Brak ocen'
  }
  if (count === 1) {
    return '1 ocena'
  }
  if (count >= 2 && count <= 4) {
    return `${count} oceny`
  }
  return `${count} ocen`
}

// ============================================================================
// Main Component
// ============================================================================

type CoffeeDetailViewProps = {
  coffeeId: string
}

export function CoffeeDetailView({ coffeeId }: CoffeeDetailViewProps) {
  const { data, isLoading, error, refetch } = useCoffeeDetail(coffeeId)

  // Handle 404 error prominently
  if (error?.code === 'coffee_not_found') {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorBanner error={error} showBackLink />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <BackLink />

      {/* Loading state */}
      {isLoading && <LoadingState />}

      {/* Error state (non-404) */}
      {error && error.code !== 'coffee_not_found' && (
        <ErrorBanner error={error} onRetry={refetch} />
      )}

      {/* Coffee details when loaded */}
      {data && (
        <>
          <CoffeeHeader coffee={data} />

          <RoasteryInfo coffee={data} />

          <MetricsSection avgMain={data.avgMain} />

          <div className="pt-4">
            <RateCoffeeButton coffeeId={coffeeId} />
          </div>
        </>
      )}
    </div>
  )
}
