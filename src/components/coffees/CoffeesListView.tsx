import { useState, useEffect, useCallback, useMemo } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Coffee } from 'lucide-react'
import { CoffeeCard, PaginationControls, type PaginationState } from './shared'
import {
  useCoffeesList,
  parseQueryFromUrl,
  type CoffeesQueryState,
} from './hooks/useCoffeesList'

// ============================================================================
// Sub-components
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
      <p className="text-muted-foreground">Ładowanie kaw...</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <Coffee className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <div>
        <h2 className="text-lg font-semibold">Brak kaw do wyświetlenia</h2>
        <p className="text-sm text-muted-foreground">
          Nie znaleziono żadnych kaw w rankingu.
        </p>
      </div>
    </div>
  )
}

type ErrorBannerProps = {
  message: string
  onRetry?: () => void
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Spróbuj ponownie
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// Main Component: CoffeesListView
// ============================================================================

type CoffeesListViewProps = {
  initialQuery: CoffeesQueryState
}

export function CoffeesListView({ initialQuery }: CoffeesListViewProps) {
  const [query, setQuery] = useState<CoffeesQueryState>(initialQuery)

  const { data, isLoading, error, refetch } = useCoffeesList(query)

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newQuery = parseQueryFromUrl()
      setQuery(newQuery)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Update URL when query changes
  const updateUrl = useCallback((newQuery: CoffeesQueryState) => {
    const params = new URLSearchParams()

    // Only add params if they differ from defaults
    if (newQuery.page !== 1) {
      params.set('page', String(newQuery.page))
    }
    if (newQuery.pageSize !== 100) {
      params.set('pageSize', String(newQuery.pageSize))
    }

    const queryString = params.toString()
    const newUrl = queryString ? `/coffees?${queryString}` : '/coffees'
    window.history.pushState({}, '', newUrl)
  }, [])

  const handlePageChange = useCallback(
    (newPage: number) => {
      const newQuery = { ...query, page: newPage }
      setQuery(newQuery)
      updateUrl(newQuery)
    },
    [query, updateUrl]
  )

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      // Reset to page 1 when changing page size
      const newQuery = { page: 1, pageSize: newPageSize }
      setQuery(newQuery)
      updateUrl(newQuery)
    },
    [updateUrl]
  )

  const pagination: PaginationState | null = useMemo(() => {
    if (!data) return null
    return {
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
      totalPages: data.totalPages,
    }
  }, [data])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Ranking kaw</h1>
        <p className="text-muted-foreground">
          Lista wszystkich kaw posortowana według średniej oceny
        </p>
      </div>

      {/* Error state */}
      {error && <ErrorBanner message={error.message} onRetry={refetch} />}

      {/* Loading state */}
      {isLoading && <LoadingState />}

      {/* Empty state */}
      {!isLoading && !error && data && data.items.length === 0 && <EmptyState />}

      {/* Coffee list */}
      {!isLoading && !error && data && data.items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => (
              <CoffeeCard key={item.id} item={item} />
            ))}
          </div>

          {pagination && (
            <PaginationControls
              pagination={pagination}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}
    </div>
  )
}
