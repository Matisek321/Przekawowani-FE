import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import { RatingSlider } from '@/components/coffees/shared/RatingSlider'
import type { RatingScore, MyRatingDto, UpsertRatingCommand } from '@/types'

// Metric labels and descriptions
const METRIC_CONFIG = {
  main: {
    label: 'Ocena kawy',
    description: 'Główna ocena smaku i jakości kawy',
  },
  strength: {
    label: 'Moc',
    description: 'Intensywność i siła kawy',
  },
  acidity: {
    label: 'Kwasowość',
    description: 'Poziom kwasowości kawy',
  },
  aftertaste: {
    label: 'Posmak',
    description: 'Smak pozostający po wypiciu',
  },
} as const

// Default rating value (middle of the scale)
const DEFAULT_RATING: RatingScore = 3

// ViewModel types
type RateCoffeeFormState = {
  main: RatingScore
  strength: RatingScore
  acidity: RatingScore
  aftertaste: RatingScore
}

type RateCoffeeFormErrors = {
  main?: string
  strength?: string
  acidity?: string
  aftertaste?: string
  form?: string
}

type RateCoffeeFormProps = {
  coffeeId: string
  coffeeName: string
  accessToken: string
  existingRating: MyRatingDto | null
  onSuccess: (rating: MyRatingDto) => void
}

// Allowed rating values
const VALID_RATINGS: RatingScore[] = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

/**
 * Validates if a value is a valid RatingScore.
 */
function isValidRatingScore(value: number): value is RatingScore {
  return VALID_RATINGS.includes(value as RatingScore)
}

/**
 * Validates a single rating value.
 */
function validateRatingValue(value: number, fieldName: string): string | undefined {
  if (!isValidRatingScore(value)) {
    return `Nieprawidłowa wartość dla pola ${fieldName}`
  }
  return undefined
}

/**
 * Validates all form fields.
 */
function validateForm(values: RateCoffeeFormState): RateCoffeeFormErrors {
  const errors: RateCoffeeFormErrors = {}

  const mainError = validateRatingValue(values.main, METRIC_CONFIG.main.label)
  if (mainError) errors.main = mainError

  const strengthError = validateRatingValue(values.strength, METRIC_CONFIG.strength.label)
  if (strengthError) errors.strength = strengthError

  const acidityError = validateRatingValue(values.acidity, METRIC_CONFIG.acidity.label)
  if (acidityError) errors.acidity = acidityError

  const aftertasteError = validateRatingValue(values.aftertaste, METRIC_CONFIG.aftertaste.label)
  if (aftertasteError) errors.aftertaste = aftertasteError

  return errors
}

/**
 * Checks if there are any field errors.
 */
function hasFieldErrors(errors: RateCoffeeFormErrors): boolean {
  return Boolean(errors.main || errors.strength || errors.acidity || errors.aftertaste)
}

/**
 * Builds the API payload from form values.
 */
function buildUpsertCommand(values: RateCoffeeFormState): UpsertRatingCommand {
  return {
    main: values.main,
    strength: values.strength,
    acidity: values.acidity,
    aftertaste: values.aftertaste,
  }
}

/**
 * Gets initial form state from existing rating or defaults.
 */
function getInitialState(existingRating: MyRatingDto | null): RateCoffeeFormState {
  if (existingRating) {
    return {
      main: existingRating.main,
      strength: existingRating.strength,
      acidity: existingRating.acidity,
      aftertaste: existingRating.aftertaste,
    }
  }
  return {
    main: DEFAULT_RATING,
    strength: DEFAULT_RATING,
    acidity: DEFAULT_RATING,
    aftertaste: DEFAULT_RATING,
  }
}

/**
 * Form component for rating a coffee.
 * Handles 4 rating metrics with validation, API submission, and error display.
 */
export function RateCoffeeForm({
  coffeeId,
  coffeeName,
  accessToken,
  existingRating,
  onSuccess,
}: RateCoffeeFormProps) {
  const [values, setValues] = useState<RateCoffeeFormState>(() =>
    getInitialState(existingRating)
  )
  const [errors, setErrors] = useState<RateCoffeeFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = existingRating !== null

  const handleValueChange = useCallback(
    (field: keyof RateCoffeeFormState) => (value: RatingScore) => {
      setValues((prev) => ({ ...prev, [field]: value }))
      // Clear field error on change
      setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }))
    },
    []
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Validate all fields
      const validationErrors = validateForm(values)
      setErrors(validationErrors)

      if (hasFieldErrors(validationErrors)) {
        return
      }

      setIsSubmitting(true)
      setErrors({})

      try {
        const command = buildUpsertCommand(values)

        const response = await fetch(`/api/coffees/${coffeeId}/my-rating`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(command),
        })

        // Success - 200 (updated) or 201 (created)
        if (response.ok) {
          const rating: MyRatingDto = await response.json()
          onSuccess(rating)
          return
        }

        // Handle error responses
        switch (response.status) {
          case 400:
            setErrors({ form: 'Nieprawidłowe dane oceny. Sprawdź wprowadzone wartości.' })
            break
          case 401:
            setErrors({ form: 'Sesja wygasła. Zaloguj się ponownie.' })
            // Redirect to login after short delay
            setTimeout(() => {
              window.location.assign(`/login?returnTo=/coffees/${coffeeId}/rate`)
            }, 2000)
            break
          case 404:
            setErrors({ form: 'Kawa nie została znaleziona.' })
            break
          case 500:
          default:
            setErrors({ form: 'Wystąpił błąd serwera. Spróbuj ponownie później.' })
            break
        }
      } catch (error) {
        console.error('Error saving rating:', error)
        setErrors({
          form: 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.',
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, coffeeId, accessToken, onSuccess]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* Form error banner */}
      {errors.form && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      )}

      {/* Rating sliders */}
      <div className="space-y-6">
        <RatingSlider
          label={METRIC_CONFIG.main.label}
          name="main"
          value={values.main}
          onChange={handleValueChange('main')}
          disabled={isSubmitting}
          error={errors.main}
          description={METRIC_CONFIG.main.description}
        />

        <RatingSlider
          label={METRIC_CONFIG.strength.label}
          name="strength"
          value={values.strength}
          onChange={handleValueChange('strength')}
          disabled={isSubmitting}
          error={errors.strength}
          description={METRIC_CONFIG.strength.description}
        />

        <RatingSlider
          label={METRIC_CONFIG.acidity.label}
          name="acidity"
          value={values.acidity}
          onChange={handleValueChange('acidity')}
          disabled={isSubmitting}
          error={errors.acidity}
          description={METRIC_CONFIG.acidity.description}
        />

        <RatingSlider
          label={METRIC_CONFIG.aftertaste.label}
          name="aftertaste"
          value={values.aftertaste}
          onChange={handleValueChange('aftertaste')}
          disabled={isSubmitting}
          error={errors.aftertaste}
          description={METRIC_CONFIG.aftertaste.description}
        />
      </div>

      {/* Submit button */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Zapisywanie...
          </>
        ) : isEditing ? (
          'Zaktualizuj ocenę'
        ) : (
          'Zapisz ocenę'
        )}
      </Button>
    </form>
  )
}
