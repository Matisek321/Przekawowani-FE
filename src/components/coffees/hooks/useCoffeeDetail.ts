import { useState, useEffect, useCallback } from 'react'
import type { CoffeeDetailDto, RoasteryDto } from '@/types'

// ============================================================================
// Types
// ============================================================================

export type CoffeeDetailVM = {
  id: string
  name: string
  roasteryId: string
  roasteryName?: string
  roasteryCity?: string
  roasteryHref: string
  avgMain: number | null
  ratingsCount: number
}

export type ApiErrorState = {
  code: string
  message: string
}

export type UseCoffeeDetailResult = {
  data: CoffeeDetailVM | null
  isLoading: boolean
  error: ApiErrorState | null
  refetch: () => void
}

// ============================================================================
// Mapping Functions
// ============================================================================

function mapCoffeeDetailToVM(
  coffee: CoffeeDetailDto,
  roastery?: RoasteryDto
): CoffeeDetailVM {
  return {
    id: coffee.id,
    name: coffee.name,
    roasteryId: coffee.roasteryId,
    roasteryName: roastery?.name,
    roasteryCity: roastery?.city,
    roasteryHref: `/roasteries/${coffee.roasteryId}`,
    avgMain: coffee.avgMain,
    ratingsCount: coffee.ratingsCount,
  }
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to fetch coffee details along with roastery information.
 * Handles loading states, error handling, and data mapping.
 */
export function useCoffeeDetail(coffeeId: string): UseCoffeeDetailResult {
  const [data, setData] = useState<CoffeeDetailVM | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiErrorState | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch coffee details
      const coffeeResponse = await fetch(`/api/coffees/${coffeeId}`, {
        cache: 'no-store',
      })

      if (!coffeeResponse.ok) {
        const errorBody = await coffeeResponse.json().catch(() => ({}))

        if (coffeeResponse.status === 404) {
          setError({
            code: errorBody.code || 'coffee_not_found',
            message: 'Kawa nie została znaleziona.',
          })
        } else if (coffeeResponse.status === 400) {
          setError({
            code: errorBody.code || 'validation_failed',
            message: 'Nieprawidłowy identyfikator kawy.',
          })
        } else {
          setError({
            code: errorBody.code || 'internal_error',
            message: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
          })
        }
        setData(null)
        return
      }

      const coffeeData: CoffeeDetailDto = await coffeeResponse.json()

      // Fetch roastery details (optional - don't fail if this fails)
      let roasteryData: RoasteryDto | undefined
      try {
        const roasteryResponse = await fetch(`/api/roasteries/${coffeeData.roasteryId}`, {
          cache: 'no-store',
        })
        if (roasteryResponse.ok) {
          roasteryData = await roasteryResponse.json()
        }
      } catch (roasteryError) {
        // Silently ignore roastery fetch errors - we can still show coffee data
        console.warn('[useCoffeeDetail] Failed to fetch roastery:', roasteryError)
      }

      setData(mapCoffeeDetailToVM(coffeeData, roasteryData))
    } catch (err) {
      console.error('[useCoffeeDetail] fetch error:', err)
      setError({
        code: 'network_error',
        message: 'Problem z połączeniem. Sprawdź połączenie internetowe.',
      })
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [coffeeId])

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
