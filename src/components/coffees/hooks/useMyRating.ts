import { useState, useEffect, useCallback } from 'react'
import type { MyRatingDto } from '@/types'

type ApiErrorState = {
  code: string
  message: string
}

type UseMyRatingResult = {
  data: MyRatingDto | null
  isLoading: boolean
  error: ApiErrorState | null
  notFound: boolean // true when 204 No Content (no rating yet)
  refetch: () => void
}

/**
 * Hook to fetch user's existing rating for a coffee.
 * 
 * Responses handled:
 * - 200: Rating exists, returns MyRatingDto
 * - 204: No rating yet, sets notFound to true
 * - 400: Invalid coffee ID
 * - 401: Unauthorized (session expired)
 * - 404: Coffee not found
 */
export function useMyRating(
  coffeeId: string,
  accessToken: string | null
): UseMyRatingResult {
  const [data, setData] = useState<MyRatingDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<ApiErrorState | null>(null)
  const [notFound, setNotFound] = useState(false)

  const fetchRating = useCallback(async () => {
    // Cannot fetch without access token
    if (!accessToken) {
      setIsLoading(false)
      setError({ code: 'unauthorized', message: 'Brak tokenu autoryzacji' })
      return
    }

    setIsLoading(true)
    setError(null)
    setNotFound(false)

    try {
      const response = await fetch(`/api/coffees/${coffeeId}/my-rating`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Cache-Control': 'no-store',
        },
      })

      // 204 No Content - user has no rating for this coffee yet
      if (response.status === 204) {
        setData(null)
        setNotFound(true)
        setIsLoading(false)
        return
      }

      // 200 OK - rating exists
      if (response.ok) {
        const ratingData: MyRatingDto = await response.json()
        setData(ratingData)
        setNotFound(false)
        setIsLoading(false)
        return
      }

      // Handle error responses
      const errorBody = await response.json().catch(() => ({ message: 'Unknown error' }))
      
      switch (response.status) {
        case 400:
          setError({
            code: 'validation_failed',
            message: 'Nieprawidłowy identyfikator kawy.',
          })
          break
        case 401:
          setError({
            code: 'unauthorized',
            message: 'Sesja wygasła. Zaloguj się ponownie.',
          })
          break
        case 404:
          setError({
            code: 'coffee_not_found',
            message: 'Kawa nie została znaleziona.',
          })
          break
        default:
          setError({
            code: errorBody.code ?? 'internal_error',
            message: errorBody.message ?? 'Wystąpił błąd serwera. Spróbuj ponownie później.',
          })
      }
    } catch (err) {
      console.error('Error fetching my rating:', err)
      setError({
        code: 'network_error',
        message: 'Problem z połączeniem. Sprawdź połączenie internetowe.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [coffeeId, accessToken])

  useEffect(() => {
    fetchRating()
  }, [fetchRating])

  return {
    data,
    isLoading,
    error,
    notFound,
    refetch: fetchRating,
  }
}
