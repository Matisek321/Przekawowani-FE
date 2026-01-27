import { useState, useCallback, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import type { CoffeeDto, CreateCoffeeCommand } from '@/types'

// Validation constants (matching API schema)
const COFFEE_NAME_MAX_LENGTH = 128

const VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Nazwa kawy jest wymagana',
  NAME_TOO_LONG: `Nazwa kawy może mieć maksymalnie ${COFFEE_NAME_MAX_LENGTH} znaków`,
}

// ViewModel types
type CreateCoffeeFormState = {
  name: string
}

type CreateCoffeeFormErrors = {
  name?: string
  form?: string
}

type CreateCoffeeFormTouched = {
  name: boolean
}

type CreateCoffeeFormProps = {
  roasteryId: string
  accessToken: string
  onSuccess: (created: CoffeeDto) => void
}

/**
 * Validates the coffee name field.
 */
function validateName(value: string): string | undefined {
  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return VALIDATION_MESSAGES.NAME_REQUIRED
  }

  if (trimmed.length > COFFEE_NAME_MAX_LENGTH) {
    return VALIDATION_MESSAGES.NAME_TOO_LONG
  }

  return undefined
}

/**
 * Validates all form fields.
 */
function validateForm(values: CreateCoffeeFormState): CreateCoffeeFormErrors {
  return {
    name: validateName(values.name),
  }
}

/**
 * Checks if there are any field errors.
 */
function hasFieldErrors(errors: CreateCoffeeFormErrors): boolean {
  return Boolean(errors.name)
}

/**
 * Form component for creating a new coffee.
 * Handles validation, API submission, and error display.
 */
export function CreateCoffeeForm({ roasteryId, accessToken, onSuccess }: CreateCoffeeFormProps) {
  const formId = useId()

  const [values, setValues] = useState<CreateCoffeeFormState>({
    name: '',
  })

  const [errors, setErrors] = useState<CreateCoffeeFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<CreateCoffeeFormTouched>({
    name: false,
  })

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValues((prev) => ({ ...prev, name: newValue }))

      // Clear field error on change if field was touched
      if (touched.name) {
        const fieldError = validateName(newValue)
        setErrors((prev) => ({ ...prev, name: fieldError, form: undefined }))
      }
    },
    [touched.name]
  )

  const handleBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, name: true }))
    const fieldError = validateName(values.name)
    setErrors((prev) => ({ ...prev, name: fieldError }))
  }, [values.name])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Mark all fields as touched
      setTouched({ name: true })

      // Validate all fields
      const validationErrors = validateForm(values)
      setErrors(validationErrors)

      if (hasFieldErrors(validationErrors)) {
        // Focus the name field on error
        const input = document.getElementById(`${formId}-name`)
        input?.focus()
        return
      }

      setIsSubmitting(true)
      setErrors({})

      try {
        const command: CreateCoffeeCommand = {
          name: values.name.trim(),
        }

        const response = await fetch(`/api/roasteries/${roasteryId}/coffees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(command),
        })

        if (response.status === 201) {
          const created: CoffeeDto = await response.json()
          onSuccess(created)
          return
        }

        // Handle error responses
        switch (response.status) {
          case 400:
            setErrors({ form: 'Nieprawidłowe dane. Sprawdź wprowadzone wartości.' })
            break
          case 401:
            setErrors({ form: 'Sesja wygasła. Zaloguj się ponownie.' })
            // Redirect to login after short delay
            setTimeout(() => {
              window.location.assign(`/login?returnTo=/roasteries/${roasteryId}/coffees/new`)
            }, 2000)
            break
          case 404:
            setErrors({ form: 'Palarnia nie została znaleziona.' })
            break
          case 409:
            setErrors({ form: 'Kawa o takiej nazwie już istnieje w tej palarni.' })
            break
          case 500:
          default:
            setErrors({ form: 'Wystąpił błąd serwera. Spróbuj ponownie później.' })
            break
        }
      } catch (error) {
        console.error('Error creating coffee:', error)
        setErrors({ form: 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.' })
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, accessToken, roasteryId, onSuccess, formId]
  )

  const nameId = `${formId}-name`
  const nameErrorId = `${formId}-name-error`

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Form error banner */}
      {errors.form && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      )}

      {/* Name field */}
      <div className="space-y-2">
        <Label htmlFor={nameId}>
          Nazwa kawy <span className="text-destructive">*</span>
        </Label>
        <Input
          id={nameId}
          name="name"
          type="text"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="np. Ethiopia Yirgacheffe"
          maxLength={COFFEE_NAME_MAX_LENGTH}
          disabled={isSubmitting}
          aria-invalid={touched.name && !!errors.name}
          aria-describedby={errors.name ? nameErrorId : undefined}
          autoComplete="off"
        />
        {touched.name && errors.name && (
          <p id={nameErrorId} className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Dodawanie...
          </>
        ) : (
          'Dodaj kawę'
        )}
      </Button>
    </form>
  )
}
