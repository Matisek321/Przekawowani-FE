import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthSession } from '@/components/auth/useAuthSession'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, AlertCircle, Coffee } from 'lucide-react'
import {
  CoffeeCard,
  PaginationControls,
  type CoffeeListItemVM,
  type PaginationState,
} from '@/components/coffees/shared'
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

export type CoffeesListVM = {
  items: CoffeeListItemVM[]
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

function mapCoffeeDtoToVM(dto: RoasteryCoffeeDto, roasteryId: string): CoffeeListItemVM {
  return {
    id: dto.id,
    name: dto.name,
    roasteryId,
    avgMain: dto.avgMain,
    ratingsCount: dto.ratingsCount,
    smallSample: dto.smallSample,
    href: `/coffees/${dto.id}`,
  }
}

function mapCoffeeListResponseToVM(response: RoasteryCoffeeListResponse, roasteryId: string): CoffeesListVM {
  const totalPages = Math.ceil(response.total / response.pageSize)
  return {
    items: response.items.map((dto) => mapCoffeeDtoToVM(dto, roasteryId)),
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
      setData(mapCoffeeListResponseToVM(json, roasteryId))
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coffeesList.data.items.map((item) => (
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
