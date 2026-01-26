import { useState, useCallback, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import type { RoasteryDto, CreateRoasteryCommand } from '@/types'

// ViewModel types
type CreateRoasteryFormState = {
  name: string
  city: string
}

type CreateRoasteryFormErrors = {
  name?: string
  city?: string
  form?: string
}

type CreateRoasteryFormProps = {
  accessToken: string
  onSuccess: (created: RoasteryDto) => void
}

// Validation constants (matching API schema)
const MAX_LENGTH = 64

function validateField(value: string, fieldName: string): string | undefined {
  const trimmed = value.trim()
  
  if (trimmed.length === 0) {
    return `Pole ${fieldName} jest wymagane`
  }
  
  if (trimmed.length > MAX_LENGTH) {
    return `Maksymalnie ${MAX_LENGTH} znaków`
  }
  
  return undefined
}

function validateForm(values: CreateRoasteryFormState): CreateRoasteryFormErrors {
  return {
    name: validateField(values.name, 'nazwa'),
    city: validateField(values.city, 'miasto'),
  }
}

function hasFieldErrors(errors: CreateRoasteryFormErrors): boolean {
  return Boolean(errors.name || errors.city)
}

/**
 * Form component for creating a new roastery.
 * Handles validation, API submission, and error display.
 */
export function CreateRoasteryForm({ accessToken, onSuccess }: CreateRoasteryFormProps) {
  const formId = useId()
  
  const [values, setValues] = useState<CreateRoasteryFormState>({
    name: '',
    city: '',
  })
  
  const [errors, setErrors] = useState<CreateRoasteryFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ name: boolean; city: boolean }>({
    name: false,
    city: false,
  })

  const handleChange = useCallback((field: keyof CreateRoasteryFormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.target.value
    setValues(prev => ({ ...prev, [field]: newValue }))
    
    // Clear field error on change if field was touched
    if (touched[field]) {
      const fieldError = validateField(newValue, field === 'name' ? 'nazwa' : 'miasto')
      setErrors(prev => ({ ...prev, [field]: fieldError, form: undefined }))
    }
  }, [touched])

  const handleBlur = useCallback((field: keyof CreateRoasteryFormState) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const fieldError = validateField(values[field], field === 'name' ? 'nazwa' : 'miasto')
    setErrors(prev => ({ ...prev, [field]: fieldError }))
  }, [values])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({ name: true, city: true })
    
    // Validate all fields
    const validationErrors = validateForm(values)
    setErrors(validationErrors)
    
    if (hasFieldErrors(validationErrors)) {
      // Focus first field with error
      const firstErrorField = validationErrors.name ? 'name' : 'city'
      const input = document.getElementById(`${formId}-${firstErrorField}`)
      input?.focus()
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      const command: CreateRoasteryCommand = {
        name: values.name.trim(),
        city: values.city.trim(),
      }
      
      const response = await fetch('/api/roasteries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(command),
      })
      
      if (response.status === 201) {
        const created: RoasteryDto = await response.json()
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
          // Optionally redirect to login
          setTimeout(() => {
            window.location.assign('/auth/login?returnTo=/roasteries/new')
          }, 2000)
          break
        case 409:
          setErrors({ form: 'Palarnia o takiej nazwie i mieście już istnieje.' })
          break
        case 500:
        default:
          setErrors({ form: 'Wystąpił błąd serwera. Spróbuj ponownie później.' })
          break
      }
    } catch (error) {
      console.error('Error creating roastery:', error)
      setErrors({ form: 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [values, accessToken, onSuccess, formId])

  const nameId = `${formId}-name`
  const cityId = `${formId}-city`
  const nameErrorId = `${formId}-name-error`
  const cityErrorId = `${formId}-city-error`

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
          Nazwa palarni <span className="text-destructive">*</span>
        </Label>
        <Input
          id={nameId}
          name="name"
          type="text"
          value={values.name}
          onChange={handleChange('name')}
          onBlur={handleBlur('name')}
          placeholder="np. Coffee Lab"
          maxLength={MAX_LENGTH}
          disabled={isSubmitting}
          aria-invalid={touched.name && !!errors.name}
          aria-describedby={errors.name ? nameErrorId : undefined}
          autoComplete="organization"
        />
        {touched.name && errors.name && (
          <p id={nameErrorId} className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      {/* City field */}
      <div className="space-y-2">
        <Label htmlFor={cityId}>
          Miasto <span className="text-destructive">*</span>
        </Label>
        <Input
          id={cityId}
          name="city"
          type="text"
          value={values.city}
          onChange={handleChange('city')}
          onBlur={handleBlur('city')}
          placeholder="np. Warszawa"
          maxLength={MAX_LENGTH}
          disabled={isSubmitting}
          aria-invalid={touched.city && !!errors.city}
          aria-describedby={errors.city ? cityErrorId : undefined}
          autoComplete="address-level2"
        />
        {touched.city && errors.city && (
          <p id={cityErrorId} className="text-sm text-destructive">
            {errors.city}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Dodawanie...
          </>
        ) : (
          'Dodaj palarnię'
        )}
      </Button>
    </form>
  )
}
