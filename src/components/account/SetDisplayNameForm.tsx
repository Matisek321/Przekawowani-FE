import { useState, useCallback, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle } from 'lucide-react'
import type { ProfileDto, SetDisplayNameCommand } from '@/types'

// ViewModel types
type SetDisplayNameFormErrors = {
  displayName?: string
  form?: string
}

type SetDisplayNameFormProps = {
  accessToken: string
  onSuccess: (profile: ProfileDto) => void
}

// Validation constants (matching API schema)
const MAX_LENGTH = 32
const DISPLAY_NAME_REGEX = /^[A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźż .\-]+$/

function validateDisplayName(value: string): string | undefined {
  const trimmed = value.trim()
  
  if (trimmed.length === 0) {
    return 'Nazwa wyświetlana jest wymagana'
  }
  
  if (trimmed.length > MAX_LENGTH) {
    return `Maksymalnie ${MAX_LENGTH} znaków`
  }
  
  if (!DISPLAY_NAME_REGEX.test(trimmed)) {
    return 'Dozwolone są tylko litery, cyfry, spacje, myślniki i kropki'
  }
  
  return undefined
}

/**
 * Form component for setting the display name.
 * Handles validation, API submission, and error display.
 */
export function SetDisplayNameForm({ accessToken, onSuccess }: SetDisplayNameFormProps) {
  const formId = useId()
  
  const [value, setValue] = useState('')
  const [errors, setErrors] = useState<SetDisplayNameFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    
    // Clear field error on change if field was touched
    if (touched) {
      const fieldError = validateDisplayName(newValue)
      setErrors(prev => ({ ...prev, displayName: fieldError, form: undefined }))
    }
  }, [touched])

  const handleBlur = useCallback(() => {
    setTouched(true)
    const fieldError = validateDisplayName(value)
    setErrors(prev => ({ ...prev, displayName: fieldError }))
  }, [value])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark field as touched
    setTouched(true)
    
    // Validate field
    const fieldError = validateDisplayName(value)
    setErrors({ displayName: fieldError })
    
    if (fieldError) {
      // Focus the field with error
      const input = document.getElementById(`${formId}-displayName`)
      input?.focus()
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      const command: SetDisplayNameCommand = {
        displayName: value.trim(),
      }
      
      const response = await fetch('/api/profiles/me/display-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(command),
      })
      
      if (response.status === 201) {
        const profile: ProfileDto = await response.json()
        onSuccess(profile)
        return
      }
      
      // Handle error responses
      const errorData = await response.json().catch(() => null)
      const errorCode = errorData?.error?.code ?? ''
      
      switch (response.status) {
        case 400:
          // Try to map validation error to field
          if (errorCode === 'validation_failed') {
            setErrors({ displayName: 'Nieprawidłowy format nazwy. Sprawdź wprowadzoną wartość.' })
          } else {
            setErrors({ form: 'Nieprawidłowe dane. Sprawdź wprowadzone wartości.' })
          }
          break
        case 401:
          setErrors({ form: 'Sesja wygasła. Zaloguj się ponownie.' })
          setTimeout(() => {
            window.location.assign('/login?returnTo=/account/display-name')
          }, 2000)
          break
        case 409:
          if (errorCode === 'display_name_already_set') {
            setErrors({ form: 'Nazwa została już ustawiona. Przekierowuję...' })
            setTimeout(() => {
              window.location.assign('/')
            }, 2000)
          } else if (errorCode === 'display_name_conflict') {
            setErrors({ displayName: 'Ta nazwa jest już zajęta. Wybierz inną.' })
          } else {
            setErrors({ form: 'Wystąpił konflikt. Spróbuj wybrać inną nazwę.' })
          }
          break
        case 500:
        default:
          setErrors({ form: 'Wystąpił błąd serwera. Spróbuj ponownie później.' })
          break
      }
    } catch (error) {
      console.error('Error setting display name:', error)
      setErrors({ form: 'Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [value, accessToken, onSuccess, formId])

  const inputId = `${formId}-displayName`
  const errorId = `${formId}-displayName-error`
  const counterId = `${formId}-displayName-counter`
  const trimmedLength = value.trim().length

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Form error banner */}
      {errors.form && (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.form}</AlertDescription>
        </Alert>
      )}

      {/* Display name field */}
      <div className="space-y-2">
        <Label htmlFor={inputId}>
          Nazwa wyświetlana <span className="text-destructive">*</span>
        </Label>
        <Input
          id={inputId}
          name="displayName"
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="np. Jan Kowalski"
          maxLength={MAX_LENGTH}
          disabled={isSubmitting}
          aria-invalid={touched && !!errors.displayName}
          aria-describedby={`${errors.displayName ? errorId : ''} ${counterId}`.trim()}
          autoComplete="nickname"
          autoFocus
        />
        <div className="flex items-center justify-between text-sm">
          {touched && errors.displayName ? (
            <p id={errorId} className="text-destructive">
              {errors.displayName}
            </p>
          ) : (
            <span />
          )}
          <p id={counterId} className="text-muted-foreground">
            {trimmedLength}/{MAX_LENGTH}
          </p>
        </div>
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
            Ustawianie...
          </>
        ) : (
          'Ustaw nazwę'
        )}
      </Button>
    </form>
  )
}
