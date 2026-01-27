import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthSession } from '@/components/auth/useAuthSession'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, AlertCircle, Coffee, Info } from 'lucide-react'
import type { RoasteryDto, RoasteryCoffeeDto, RoasteryCoffeeListResponse } from '@/types'

// ============================================================================
// ViewModel Types
// ============================================================================

export type RoasteryCoffeesQueryState = {
  page: number
  pageSize: number
}

export type RoasteryDetailVM = {
  id: string
  name: string
  city: string
}

export type CoffeeListItemVM = {
  id: string
  name: string
  avgMain: number | null
  ratingsCount: number
  smallSample: boolean
  href: string
}

export type CoffeesListVM = {
  items: CoffeeListItemVM[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type PaginationState = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type ApiErrorState = {
  code: string
  message: string
}

// ============================================================================
// Mapping Functions
// ============================================================================

function mapRoasteryDtoToVM(dto: RoasteryDto): RoasteryDetailVM {
  return {
    id: dto.id,
    name: dto.name,
    city: dto.city,
  }
}

function mapCoffeeDtoToVM(dto: RoasteryCoffeeDto): CoffeeListItemVM {
  return {
    id: dto.id,
    name: dto.name,
    avgMain: dto.avgMain,
    ratingsCount: dto.ratingsCount,
    smallSample: dto.smallSample,
    href: `/coffees/${dto.id}`,
  }
}

function mapCoffeeListResponseToVM(response: RoasteryCoffeeListResponse): CoffeesListVM {
  const totalPages = Math.ceil(response.total / response.pageSize)
  return {
    items: response.items.map(mapCoffeeDtoToVM),
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
    totalPages,
  }
}

// ============================================================================
// Custom Hook: useRoasteryDetail
// ============================================================================

type UseRoasteryDetailResult = {
  data: RoasteryDetailVM | null
  isLoading: boolean
  error: ApiErrorState | null
}

function useRoasteryDetail(roasteryId: string): UseRoasteryDetailResult {
  const [data, setData] = useState<RoasteryDetailVM | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiErrorState | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/roasteries/${roasteryId}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))

        if (response.status === 404) {
          setError({
            code: errorBody.code || 'roastery_not_found',
            message: 'Palarnia nie została znaleziona.',
          })
        } else if (response.status === 400) {
          setError({
            code: errorBody.code || 'invalid_request',
            message: 'Nieprawidłowy identyfikator palarni.',
          })
        } else {
          setError({
            code: errorBody.code || 'internal_error',
            message: 'Wystąpił błąd podczas pobierania danych.',
          })
        }
        setData(null)
        return
      }

      const json: RoasteryDto = await response.json()
      setData(mapRoasteryDtoToVM(json))
    } catch (err) {
      console.error('[useRoasteryDetail] fetch error:', err)
      setError({
        code: 'network_error',
        message: 'Problem z połączeniem. Sprawdź połączenie internetowe.',
      })
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [roasteryId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
  }
}

// ============================================================================
// Custom Hook: useRoasteryCoffees
// ============================================================================

type UseRoasteryCoffeesResult = {
  data: CoffeesListVM | null
  isLoading: boolean
  error: ApiErrorState | null
  refetch: () => void
}

function useRoasteryCoffees(
  roasteryId: string,
  query: RoasteryCoffeesQueryState
): UseRoasteryCoffeesResult {
  const [data, setData] = useState<CoffeesListVM | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiErrorState | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
      })

      const response = await fetch(`/api/roasteries/${roasteryId}/coffees?${params}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))

        if (response.status === 404) {
          setError({
            code: errorBody.code || 'roastery_not_found',
            message: 'Palarnia nie została znaleziona.',
          })
        } else if (response.status === 400) {
          setError({
            code: errorBody.code || 'invalid_request',
            message: 'Nieprawidłowe parametry zapytania.',
          })
        } else {
          setError({
            code: errorBody.code || 'internal_error',
            message: 'Wystąpił błąd podczas pobierania listy kaw.',
          })
        }
        setData(null)
        return
      }

      const json: RoasteryCoffeeListResponse = await response.json()
      setData(mapCoffeeListResponseToVM(json))
    } catch (err) {
      console.error('[useRoasteryCoffees] fetch error:', err)
      setError({
        code: 'network_error',
        message: 'Problem z połączeniem. Sprawdź połączenie internetowe.',
      })
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [roasteryId, query.page, query.pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

// ============================================================================
// Sub-components
// ============================================================================

type RatingBadgeProps = {
  value: number | null
}

function RatingBadge({ value }: RatingBadgeProps) {
  if (value === null) {
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        Brak ocen
      </span>
    )
  }

  // Color based on rating value
  let colorClasses = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  if (value >= 4.5) {
    colorClasses = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  } else if (value >= 3.5) {
    colorClasses = 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200'
  } else if (value < 2.5) {
    colorClasses = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${colorClasses}`}>
      {value.toFixed(1)}
    </span>
  )
}

function SmallSampleBadge() {
  return (
    <span 
      className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      title="Ocena oparta na mniej niż 3 opiniach"
    >
      <Info className="h-3 w-3" />
      Mała próba
    </span>
  )
}

type RoasteryHeaderProps = {
  roastery: RoasteryDetailVM
  showAddCoffeeButton: boolean
}

function RoasteryHeader({ roastery, showAddCoffeeButton }: RoasteryHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{roastery.name}</h1>
        <p className="text-muted-foreground">{roastery.city}</p>
      </div>
      {showAddCoffeeButton && (
        <Button asChild>
          <a href={`/roasteries/${roastery.id}/coffees/new`}>
            <Plus className="h-4 w-4" />
            Dodaj kawę
          </a>
        </Button>
      )}
    </div>
  )
}

type CoffeeCardProps = {
  item: CoffeeListItemVM
}

function CoffeeCard({ item }: CoffeeCardProps) {
  return (
    <a href={item.href} className="block transition-transform hover:scale-[1.02]">
      <Card className="h-full cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{item.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <RatingBadge value={item.avgMain} />
            {item.smallSample && <SmallSampleBadge />}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {item.ratingsCount} {item.ratingsCount === 1 ? 'ocena' : item.ratingsCount >= 2 && item.ratingsCount <= 4 ? 'oceny' : 'ocen'}
          </p>
        </CardContent>
      </Card>
    </a>
  )
}

type CoffeeListProps = {
  items: CoffeeListItemVM[]
}

function CoffeeList({ items }: CoffeeListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <CoffeeCard key={item.id} item={item} />
      ))}
    </div>
  )
}

type PaginationControlsProps = {
  pagination: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function PaginationControls({ pagination, onPageChange, onPageSizeChange }: PaginationControlsProps) {
  const { page, pageSize, totalPages } = pagination

  const pageSizeOptions = [10, 30, 50, 100]

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const pages: number[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      // Calculate range around current page
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)

      if (start > 2) {
        pages.push(-1) // Ellipsis
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (end < totalPages - 1) {
        pages.push(-2) // Ellipsis
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const visiblePages = getVisiblePages()

  if (totalPages <= 1 && pageSize === 30) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Na stronie:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-9 rounded-md border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Liczba elementów na stronie"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Poprzednia strona"
          >
            ←
          </Button>

          {visiblePages.map((pageNum, index) => {
            if (pageNum < 0) {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              )
            }

            return (
              <Button
                key={pageNum}
                variant={pageNum === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                aria-label={`Strona ${pageNum}`}
                aria-current={pageNum === page ? 'page' : undefined}
              >
                {pageNum}
              </Button>
            )
          })}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Następna strona"
          >
            →
          </Button>
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Ładowanie...</p>
    </div>
  )
}

type EmptyStateProps = {
  roasteryId: string
  showAddButton: boolean
}

function EmptyState({ roasteryId, showAddButton }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <Coffee className="h-12 w-12 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold">Brak kaw</h2>
        <p className="text-sm text-muted-foreground">
          Ta palarnia nie ma jeszcze żadnych kaw.
          {showAddButton && ' Dodaj pierwszą!'}
        </p>
      </div>
      {showAddButton && (
        <Button asChild>
          <a href={`/roasteries/${roasteryId}/coffees/new`}>
            <Plus className="h-4 w-4" />
            Dodaj kawę
          </a>
        </Button>
      )}
    </div>
  )
}

type ErrorBannerProps = {
  message: string
  onRetry?: () => void
  showBackLink?: boolean
}

function ErrorBanner({ message, onRetry, showBackLink }: ErrorBannerProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        <div className="flex gap-2">
          {showBackLink && (
            <Button variant="outline" size="sm" asChild>
              <a href="/roasteries">Powrót do listy</a>
            </Button>
          )}
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Spróbuj ponownie
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// Main Component: RoasteryDetailView
// ============================================================================

type RoasteryDetailViewProps = {
  roasteryId: string
  initialQuery: RoasteryCoffeesQueryState
}

// Helper to parse query params from URL
function parseQueryFromUrl(): RoasteryCoffeesQueryState {
  const params = new URLSearchParams(window.location.search)
  const rawPage = params.get('page')
  const rawPageSize = params.get('pageSize')

  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1

  const parsedPageSize = rawPageSize ? parseInt(rawPageSize, 10) : 30
  const pageSize = Number.isInteger(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100
    ? parsedPageSize
    : 30

  return { page, pageSize }
}

export function RoasteryDetailView({ roasteryId, initialQuery }: RoasteryDetailViewProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthSession()
  const [query, setQuery] = useState<RoasteryCoffeesQueryState>(initialQuery)

  const roasteryDetail = useRoasteryDetail(roasteryId)
  const coffeesList = useRoasteryCoffees(roasteryId, query)

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
  const updateUrl = useCallback((newQuery: RoasteryCoffeesQueryState) => {
    const params = new URLSearchParams({
      page: String(newQuery.page),
      pageSize: String(newQuery.pageSize),
    })
    const newUrl = `/roasteries/${roasteryId}?${params}`
    window.history.pushState({}, '', newUrl)
  }, [roasteryId])

  const handlePageChange = useCallback((newPage: number) => {
    const newQuery = { ...query, page: newPage }
    setQuery(newQuery)
    updateUrl(newQuery)
  }, [query, updateUrl])

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    // Reset to page 1 when changing page size
    const newQuery = { page: 1, pageSize: newPageSize }
    setQuery(newQuery)
    updateUrl(newQuery)
  }, [updateUrl])

  const pagination: PaginationState | null = useMemo(() => {
    if (!coffeesList.data) return null
    return {
      page: coffeesList.data.page,
      pageSize: coffeesList.data.pageSize,
      total: coffeesList.data.total,
      totalPages: coffeesList.data.totalPages,
    }
  }, [coffeesList.data])

  const showAddCoffeeButton = !isAuthLoading && isAuthenticated

  // Combine refetch for both hooks
  const handleRetry = useCallback(() => {
    coffeesList.refetch()
  }, [coffeesList])

  // Show roastery not found error prominently
  if (roasteryDetail.error?.code === 'roastery_not_found') {
    return (
      <div className="space-y-6">
        <ErrorBanner
          message={roasteryDetail.error.message}
          showBackLink
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Loading state for roastery details */}
      {roasteryDetail.isLoading && <LoadingState />}

      {/* Error for roastery (non-404) */}
      {roasteryDetail.error && roasteryDetail.error.code !== 'roastery_not_found' && (
        <ErrorBanner message={roasteryDetail.error.message} onRetry={handleRetry} />
      )}

      {/* Roastery header when loaded */}
      {roasteryDetail.data && (
        <RoasteryHeader
          roastery={roasteryDetail.data}
          showAddCoffeeButton={showAddCoffeeButton}
        />
      )}

      {/* Error for coffees list */}
      {coffeesList.error && (
        <ErrorBanner message={coffeesList.error.message} onRetry={handleRetry} />
      )}

      {/* Loading state for coffees (only if roastery is loaded) */}
      {roasteryDetail.data && coffeesList.isLoading && <LoadingState />}

      {/* Empty state when no coffees */}
      {roasteryDetail.data && !coffeesList.isLoading && !coffeesList.error && coffeesList.data && coffeesList.data.items.length === 0 && (
        <EmptyState roasteryId={roasteryId} showAddButton={showAddCoffeeButton} />
      )}

      {/* Coffee list with pagination */}
      {roasteryDetail.data && !coffeesList.isLoading && !coffeesList.error && coffeesList.data && coffeesList.data.items.length > 0 && (
        <>
          <CoffeeList items={coffeesList.data.items} />
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
