import { useState, useEffect, useCallback } from 'react'
import type { CoffeeDto, CoffeeListResponse } from '@/types'
import type { CoffeeListItemVM, PaginationState } from '../shared'

// ============================================================================
// Types
// ============================================================================

export type CoffeesQueryState = {
  page: number
  pageSize: number
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

export type UseCoffeesListResult = {
  data: CoffeesListVM | null
  isLoading: boolean
  error: ApiErrorState | null
  refetch: () => void
}

// ============================================================================
// Mapping Functions
// ============================================================================

function mapCoffeeDtoToVM(dto: CoffeeDto): CoffeeListItemVM {
  return {
    id: dto.id,
    name: dto.name,
    roasteryId: dto.roasteryId,
    avgMain: dto.avgMain,
    ratingsCount: dto.ratingsCount,
    href: `/coffees/${dto.id}`,
  }
}

function mapResponseToVM(response: CoffeeListResponse): CoffeesListVM {
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
// URL Parsing Helper
// ============================================================================

export function parseQueryFromUrl(): CoffeesQueryState {
  const params = new URLSearchParams(window.location.search)
  const rawPage = params.get('page')
  const rawPageSize = params.get('pageSize')

  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1

  const parsedPageSize = rawPageSize ? parseInt(rawPageSize, 10) : 100
  const pageSize =
    Number.isInteger(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100
      ? parsedPageSize
      : 100

  return { page, pageSize }
}

// ============================================================================
// Custom Hook: useCoffeesList
// ============================================================================

export function useCoffeesList(query: CoffeesQueryState): UseCoffeesListResult {
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
        sort: 'rating_desc',
      })

      const response = await fetch(`/api/coffees?${params}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))

        if (response.status === 400) {
          setError({
            code: errorBody.code || 'validation_failed',
            message: 'Nieprawidłowe parametry zapytania.',
          })
        } else if (response.status === 500) {
          setError({
            code: errorBody.code || 'internal_error',
            message: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
          })
        } else {
          setError({
            code: errorBody.code || 'unknown_error',
            message: 'Wystąpił nieoczekiwany błąd.',
          })
        }
        setData(null)
        return
      }

      const json: CoffeeListResponse = await response.json()
      setData(mapResponseToVM(json))
    } catch (err) {
      console.error('[useCoffeesList] fetch error:', err)

      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError({
          code: 'network_error',
          message: 'Problem z połączeniem. Sprawdź połączenie internetowe.',
        })
      } else {
        setError({
          code: 'network_error',
          message: 'Problem z połączeniem. Sprawdź połączenie internetowe.',
        })
      }
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
