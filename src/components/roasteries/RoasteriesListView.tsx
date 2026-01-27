import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuthSession } from '@/components/auth/useAuthSession'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, AlertCircle, Coffee } from 'lucide-react'
import type { RoasteryDto, RoasteryListResponse } from '@/types'

// ============================================================================
// ViewModel Types
// ============================================================================

export type RoasteriesQueryState = {
  page: number
  pageSize: number
}

export type RoasteryListItemVM = {
  id: string
  name: string
  city: string
  href: string
}

export type RoasteriesListVM = {
  items: RoasteryListItemVM[]
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
// Helper Functions
// ============================================================================

function mapDtoToVM(dto: RoasteryDto): RoasteryListItemVM {
  return {
    id: dto.id,
    name: dto.name,
    city: dto.city,
    href: `/roasteries/${dto.id}`,
  }
}

function mapResponseToVM(response: RoasteryListResponse): RoasteriesListVM {
  const totalPages = Math.ceil(response.total / response.pageSize)
  return {
    items: response.items.map(mapDtoToVM),
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
    totalPages,
  }
}

// ============================================================================
// Sub-components
// ============================================================================

type PageHeaderProps = {
  isAuthenticated: boolean
}

function PageHeader({ isAuthenticated }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Palarnie</h1>
      {isAuthenticated && (
        <Button asChild>
          <a href="/roasteries/new">
            <Plus className="h-4 w-4" />
            Dodaj palarnię
          </a>
        </Button>
      )}
    </div>
  )
}

type RoasteryCardProps = {
  item: RoasteryListItemVM
}

function RoasteryCard({ item }: RoasteryCardProps) {
  return (
    <a href={item.href} className="block transition-transform hover:scale-[1.02]">
      <Card className="h-full cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{item.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{item.city}</p>
        </CardContent>
      </Card>
    </a>
  )
}

type RoasteriesListProps = {
  items: RoasteryListItemVM[]
}

function RoasteriesList({ items }: RoasteriesListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <RoasteryCard key={item.id} item={item} />
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
  
  const pageSizeOptions = [10, 20, 50, 100]
  
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
      let start = Math.max(2, page - 1)
      let end = Math.min(totalPages - 1, page + 1)
      
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
  
  if (totalPages <= 1 && pageSize === 20) {
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
      <p className="text-muted-foreground">Ładowanie palarni...</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <Coffee className="h-12 w-12 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold">Brak palarni</h2>
        <p className="text-sm text-muted-foreground">
          Nie znaleziono żadnych palarni. Dodaj pierwszą!
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
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-4">
            Spróbuj ponownie
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

// ============================================================================
// Custom Hook: useRoasteriesList
// ============================================================================

type UseRoasteriesListResult = {
  data: RoasteriesListVM | null
  isLoading: boolean
  error: ApiErrorState | null
  refetch: () => void
}

function useRoasteriesList(query: RoasteriesQueryState): UseRoasteriesListResult {
  const [data, setData] = useState<RoasteriesListVM | null>(null)
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

      // The API response is cacheable; for list freshness (e.g. after creating a roastery),
      // bypass the browser HTTP cache and always hit the server.
      const response = await fetch(`/api/roasteries?${params}`, {
        cache: 'no-store',
      })
      
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        
        if (response.status === 400) {
          setError({
            code: errorBody.code || 'invalid_request',
            message: 'Nieprawidłowe parametry listy.',
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

      const json: RoasteryListResponse = await response.json()
      setData(mapResponseToVM(json))
    } catch (err) {
      console.error('[useRoasteriesList] fetch error:', err)
      setError({
        code: 'network_error',
        message: 'Problem z połączeniem. Sprawdź połączenie internetowe.',
      })
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [query.page, query.pageSize])

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
// Main Component: RoasteriesListView
// ============================================================================

type RoasteriesListViewProps = {
  initialQuery: RoasteriesQueryState
}

// Helper to parse query params from URL
function parseQueryFromUrl(): RoasteriesQueryState {
  const params = new URLSearchParams(window.location.search)
  const rawPage = params.get('page')
  const rawPageSize = params.get('pageSize')

  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1

  const parsedPageSize = rawPageSize ? parseInt(rawPageSize, 10) : 20
  const pageSize = Number.isInteger(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100
    ? parsedPageSize
    : 20

  return { page, pageSize }
}

export function RoasteriesListView({ initialQuery }: RoasteriesListViewProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthSession()
  const [query, setQuery] = useState<RoasteriesQueryState>(initialQuery)
  
  const { data, isLoading, error, refetch } = useRoasteriesList(query)

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
  const updateUrl = useCallback((newQuery: RoasteriesQueryState) => {
    const params = new URLSearchParams({
      page: String(newQuery.page),
      pageSize: String(newQuery.pageSize),
    })
    const newUrl = `/roasteries?${params}`
    window.history.pushState({}, '', newUrl)
  }, [])

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
      <PageHeader isAuthenticated={!isAuthLoading && isAuthenticated} />

      {error && (
        <ErrorBanner message={error.message} onRetry={refetch} />
      )}

      {isLoading && <LoadingState />}

      {!isLoading && !error && data && data.items.length === 0 && (
        <EmptyState />
      )}

      {!isLoading && !error && data && data.items.length > 0 && (
        <>
          <RoasteriesList items={data.items} />
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
