import { useState, useCallback, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

// ViewModel types
type ResetPasswordFormState = {
  password: string
  confirmPassword: string
}

type ResetPasswordFormErrors = {
  password?: string
  confirmPassword?: string
  form?: string
}

// Validation constants
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 72

function validatePassword(value: string): string | undefined {
  if (value.length === 0) {
    return 'Hasło jest wymagane'
  }
  
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Hasło musi mieć minimum ${MIN_PASSWORD_LENGTH} znaków`
  }
  
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Hasło może mieć maksymalnie ${MAX_PASSWORD_LENGTH} znaki`
  }
  
  return undefined
}

function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (confirmPassword.length === 0) {
    return 'Potwierdzenie hasła jest wymagane'
  }
  
  if (password !== confirmPassword) {
    return 'Hasła nie są identyczne'
  }
  
  return undefined
}

function validateForm(values: ResetPasswordFormState): ResetPasswordFormErrors {
  return {
    password: validatePassword(values.password),
    confirmPassword: validateConfirmPassword(values.password, values.confirmPassword),
  }
}

function hasFieldErrors(errors: ResetPasswordFormErrors): boolean {
  return Boolean(errors.password || errors.confirmPassword)
}

/**
 * Error code to user-friendly message mapping
 */
function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    invalid_token: 'Link do resetowania hasła wygasł lub jest nieprawidłowy',
    weak_password: 'Hasło musi mieć minimum 8 znaków',
    network_error: 'Błąd połączenia. Sprawdź połączenie internetowe.',
  }
  return messages[code] || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
}

/**
 * Reset password form component.
 * Allows user to set a new password after clicking the reset link.
 */
export function ResetPasswordForm() {
  const formId = useId()
  
  const [values, setValues] = useState<ResetPasswordFormState>({
    password: '',
    confirmPassword: '',
  })
  
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [touched, setTouched] = useState<{ 
    password: boolean
    confirmPassword: boolean 
  }>({
    password: false,
    confirmPassword: false,
  })

  const handleChange = useCallback((field: keyof ResetPasswordFormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.target.value
    setValues(prev => {
      const newValues = { ...prev, [field]: newValue }
      
      // Clear field error on change if field was touched
      if (touched[field]) {
        let fieldError: string | undefined
        
        if (field === 'password') {
          fieldError = validatePassword(newValue)
          // Also revalidate confirm password when password changes
          if (touched.confirmPassword) {
            const confirmError = validateConfirmPassword(newValue, newValues.confirmPassword)
            setErrors(prevErrors => ({ 
              ...prevErrors, 
              [field]: fieldError,
              confirmPassword: confirmError,
              form: undefined 
            }))
            return newValues
          }
        } else {
          fieldError = validateConfirmPassword(newValues.password, newValue)
        }
        
        setErrors(prevErrors => ({ ...prevErrors, [field]: fieldError, form: undefined }))
      }
      
      return newValues
    })
  }, [touched])

  const handleBlur = useCallback((field: keyof ResetPasswordFormState) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    let fieldError: string | undefined
    if (field === 'password') {
      fieldError = validatePassword(values[field])
    } else {
      fieldError = validateConfirmPassword(values.password, values[field])
    }
    
    setErrors(prev => ({ ...prev, [field]: fieldError }))
  }, [values])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({ password: true, confirmPassword: true })
    
    // Validate all fields
    const validationErrors = validateForm(values)
    setErrors(validationErrors)
    
    if (hasFieldErrors(validationErrors)) {
      // Focus first field with error
      const firstErrorField = validationErrors.password ? 'password' : 'confirmPassword'
      const input = document.getElementById(`${formId}-${firstErrorField}`)
      input?.focus()
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: values.password,
        }),
      })
      
      if (response.ok) {
        setIsSuccess(true)
        return
      }
      
      // Handle error responses
      const data = await response.json().catch(() => ({}))
      const errorCode = data.code || 'unknown'
      
      switch (response.status) {
        case 400:
          setErrors({ form: getErrorMessage('weak_password') })
          break
        case 401:
          setErrors({ form: getErrorMessage('invalid_token') })
          break
        default:
          setErrors({ form: getErrorMessage(errorCode) })
          break
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setErrors({ form: getErrorMessage('network_error') })
    } finally {
      setIsSubmitting(false)
    }
  }, [values, formId])

  const passwordId = `${formId}-password`
  const confirmPasswordId = `${formId}-confirmPassword`
  const passwordErrorId = `${formId}-password-error`
  const confirmPasswordErrorId = `${formId}-confirmPassword-error`

  // Show success state
  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Hasło zostało zmienione</CardTitle>
          <CardDescription className="text-base">
            Twoje hasło zostało pomyślnie zaktualizowane. Możesz teraz zalogować się używając nowego hasła.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <a href="/login" className="w-full">
            <Button className="w-full">
              Przejdź do logowania
            </Button>
          </a>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Ustaw nowe hasło</CardTitle>
        <CardDescription>
          Wprowadź swoje nowe hasło
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {/* Form error banner */}
          {errors.form && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor={passwordId}>
              Nowe hasło <span className="text-destructive">*</span>
            </Label>
            <Input
              id={passwordId}
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              disabled={isSubmitting}
              aria-invalid={touched.password && !!errors.password}
              aria-describedby={errors.password ? passwordErrorId : undefined}
              autoComplete="new-password"
              autoFocus
            />
            {touched.password && errors.password && (
              <p id={passwordErrorId} className="text-sm text-destructive">
                {errors.password}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum {MIN_PASSWORD_LENGTH} znaków
            </p>
          </div>

          {/* Confirm Password field */}
          <div className="space-y-2">
            <Label htmlFor={confirmPasswordId}>
              Potwierdź hasło <span className="text-destructive">*</span>
            </Label>
            <Input
              id={confirmPasswordId}
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              onChange={handleChange('confirmPassword')}
              onBlur={handleBlur('confirmPassword')}
              disabled={isSubmitting}
              aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? confirmPasswordErrorId : undefined}
              autoComplete="new-password"
            />
            {touched.confirmPassword && errors.confirmPassword && (
              <p id={confirmPasswordErrorId} className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              'Ustaw nowe hasło'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
