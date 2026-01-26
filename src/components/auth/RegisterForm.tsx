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
type RegisterFormState = {
  email: string
  password: string
  confirmPassword: string
}

type RegisterFormErrors = {
  email?: string
  password?: string
  confirmPassword?: string
  form?: string
}

// Validation constants
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 72

// Email regex for basic validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(value: string): string | undefined {
  const trimmed = value.trim()
  
  if (trimmed.length === 0) {
    return 'Adres email jest wymagany'
  }
  
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Podaj prawidłowy adres email'
  }
  
  return undefined
}

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

function validateForm(values: RegisterFormState): RegisterFormErrors {
  return {
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirmPassword: validateConfirmPassword(values.password, values.confirmPassword),
  }
}

function hasFieldErrors(errors: RegisterFormErrors): boolean {
  return Boolean(errors.email || errors.password || errors.confirmPassword)
}

/**
 * Error code to user-friendly message mapping
 */
function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    email_taken: 'Konto z tym adresem email już istnieje',
    weak_password: 'Hasło musi mieć minimum 8 znaków',
    invalid_email: 'Podaj prawidłowy adres email',
    too_many_requests: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
    network_error: 'Błąd połączenia. Sprawdź połączenie internetowe.',
  }
  return messages[code] || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
}

/**
 * Register form component with client-side validation.
 * Handles form state, validation, and submission.
 */
export function RegisterForm() {
  const formId = useId()
  
  const [values, setValues] = useState<RegisterFormState>({
    email: '',
    password: '',
    confirmPassword: '',
  })
  
  const [errors, setErrors] = useState<RegisterFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [touched, setTouched] = useState<{ 
    email: boolean
    password: boolean
    confirmPassword: boolean 
  }>({
    email: false,
    password: false,
    confirmPassword: false,
  })

  const handleChange = useCallback((field: keyof RegisterFormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.target.value
    setValues(prev => {
      const newValues = { ...prev, [field]: newValue }
      
      // Clear field error on change if field was touched
      if (touched[field]) {
        let fieldError: string | undefined
        
        if (field === 'email') {
          fieldError = validateEmail(newValue)
        } else if (field === 'password') {
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

  const handleBlur = useCallback((field: keyof RegisterFormState) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    let fieldError: string | undefined
    if (field === 'email') {
      fieldError = validateEmail(values[field])
    } else if (field === 'password') {
      fieldError = validatePassword(values[field])
    } else {
      fieldError = validateConfirmPassword(values.password, values[field])
    }
    
    setErrors(prev => ({ ...prev, [field]: fieldError }))
  }, [values])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({ email: true, password: true, confirmPassword: true })
    
    // Validate all fields
    const validationErrors = validateForm(values)
    setErrors(validationErrors)
    
    if (hasFieldErrors(validationErrors)) {
      // Focus first field with error
      const firstErrorField = validationErrors.email 
        ? 'email' 
        : validationErrors.password 
          ? 'password' 
          : 'confirmPassword'
      const input = document.getElementById(`${formId}-${firstErrorField}`)
      input?.focus()
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    setSuccessMessage(null)
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
        }),
      })
      
      if (response.status === 201) {
        setSuccessMessage(
          'Konto zostało utworzone! Sprawdź swoją skrzynkę pocztową i kliknij link, aby potwierdzić adres email.'
        )
        // Clear form
        setValues({ email: '', password: '', confirmPassword: '' })
        setTouched({ email: false, password: false, confirmPassword: false })
        return
      }
      
      // Handle error responses
      const data = await response.json().catch(() => ({}))
      const errorCode = data.code || 'unknown'
      
      switch (response.status) {
        case 400:
          setErrors({ form: getErrorMessage(errorCode) })
          break
        case 409:
          setErrors({ form: getErrorMessage('email_taken') })
          break
        case 429:
          setErrors({ form: getErrorMessage('too_many_requests') })
          break
        default:
          setErrors({ form: getErrorMessage(errorCode) })
          break
      }
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ form: getErrorMessage('network_error') })
    } finally {
      setIsSubmitting(false)
    }
  }, [values, formId])

  const emailId = `${formId}-email`
  const passwordId = `${formId}-password`
  const confirmPasswordId = `${formId}-confirmPassword`
  const emailErrorId = `${formId}-email-error`
  const passwordErrorId = `${formId}-password-error`
  const confirmPasswordErrorId = `${formId}-confirmPassword-error`

  // Show success state
  if (successMessage) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Sprawdź swoją skrzynkę</CardTitle>
          <CardDescription className="text-base">
            {successMessage}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4">
          <a href="/auth/login" className="w-full">
            <Button variant="outline" className="w-full">
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
        <CardTitle className="text-2xl">Utwórz konto</CardTitle>
        <CardDescription>
          Wprowadź swoje dane, aby utworzyć nowe konto
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

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor={emailId}>
              Adres email <span className="text-destructive">*</span>
            </Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              placeholder="jan@example.com"
              disabled={isSubmitting}
              aria-invalid={touched.email && !!errors.email}
              aria-describedby={errors.email ? emailErrorId : undefined}
              autoComplete="email"
              autoFocus
            />
            {touched.email && errors.email && (
              <p id={emailErrorId} className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor={passwordId}>
              Hasło <span className="text-destructive">*</span>
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
                Rejestrowanie...
              </>
            ) : (
              'Zarejestruj się'
            )}
          </Button>

          {/* Login link */}
          <p className="text-center text-sm text-muted-foreground">
            Masz już konto?{' '}
            <a href="/auth/login" className="text-primary hover:underline">
              Zaloguj się
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
