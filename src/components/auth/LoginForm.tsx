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
import { Loader2, AlertCircle } from 'lucide-react'

// ViewModel types
type LoginFormState = {
  email: string
  password: string
}

type LoginFormErrors = {
  email?: string
  password?: string
  form?: string
}

// Validation constants
const MIN_PASSWORD_LENGTH = 8

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
  
  return undefined
}

function validateForm(values: LoginFormState): LoginFormErrors {
  return {
    email: validateEmail(values.email),
    password: validatePassword(values.password),
  }
}

function hasFieldErrors(errors: LoginFormErrors): boolean {
  return Boolean(errors.email || errors.password)
}

/**
 * Error code to user-friendly message mapping
 */
function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    invalid_credentials: 'Nieprawidłowy adres email lub hasło',
    email_not_confirmed: 'Adres email nie został potwierdzony. Sprawdź skrzynkę pocztową.',
    too_many_requests: 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.',
    network_error: 'Błąd połączenia. Sprawdź połączenie internetowe.',
  }
  return messages[code] || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
}

/**
 * Login form component with client-side validation.
 * Handles form state, validation, and submission.
 */
export function LoginForm() {
  const formId = useId()
  
  const [values, setValues] = useState<LoginFormState>({
    email: '',
    password: '',
  })
  
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  })

  const handleChange = useCallback((field: keyof LoginFormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = e.target.value
    setValues(prev => ({ ...prev, [field]: newValue }))
    
    // Clear field error on change if field was touched
    if (touched[field]) {
      const fieldError = field === 'email' 
        ? validateEmail(newValue) 
        : validatePassword(newValue)
      setErrors(prev => ({ ...prev, [field]: fieldError, form: undefined }))
    }
  }, [touched])

  const handleBlur = useCallback((field: keyof LoginFormState) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const fieldError = field === 'email' 
      ? validateEmail(values[field]) 
      : validatePassword(values[field])
    setErrors(prev => ({ ...prev, [field]: fieldError }))
  }, [values])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({ email: true, password: true })
    
    // Validate all fields
    const validationErrors = validateForm(values)
    setErrors(validationErrors)
    
    if (hasFieldErrors(validationErrors)) {
      // Focus first field with error
      const firstErrorField = validationErrors.email ? 'email' : 'password'
      const input = document.getElementById(`${formId}-${firstErrorField}`)
      input?.focus()
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
        }),
      })
      
      if (response.ok) {
        // Get return URL from query params or default to home
        const urlParams = new URLSearchParams(window.location.search)
        const returnUrl = urlParams.get('returnUrl') || '/'
        window.location.assign(returnUrl)
        return
      }
      
      // Handle error responses
      const data = await response.json().catch(() => ({}))
      const errorCode = data.code || 'unknown'
      
      switch (response.status) {
        case 401:
          setErrors({ form: getErrorMessage('invalid_credentials') })
          break
        case 403:
          setErrors({ form: getErrorMessage('email_not_confirmed') })
          break
        case 429:
          setErrors({ form: getErrorMessage('too_many_requests') })
          break
        default:
          setErrors({ form: getErrorMessage(errorCode) })
          break
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ form: getErrorMessage('network_error') })
    } finally {
      setIsSubmitting(false)
    }
  }, [values, formId])

  const emailId = `${formId}-email`
  const passwordId = `${formId}-password`
  const emailErrorId = `${formId}-email-error`
  const passwordErrorId = `${formId}-password-error`

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Zaloguj się</CardTitle>
        <CardDescription>
          Wprowadź swoje dane, aby się zalogować
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
            <Label htmlFor={emailId}>Adres email</Label>
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
            <div className="flex items-center justify-between">
              <Label htmlFor={passwordId}>Hasło</Label>
              <a 
                href="/auth/forgot-password" 
                className="text-sm text-primary hover:underline"
              >
                Zapomniałeś hasła?
              </a>
            </div>
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
              autoComplete="current-password"
            />
            {touched.password && errors.password && (
              <p id={passwordErrorId} className="text-sm text-destructive">
                {errors.password}
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
                Logowanie...
              </>
            ) : (
              'Zaloguj się'
            )}
          </Button>

          {/* Register link */}
          <p className="text-center text-sm text-muted-foreground">
            Nie masz konta?{' '}
            <a href="/auth/register" className="text-primary hover:underline">
              Zarejestruj się
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
