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
import { Loader2, AlertCircle, Mail } from 'lucide-react'

// ViewModel types
type ForgotPasswordFormState = {
  email: string
}

type ForgotPasswordFormErrors = {
  email?: string
  form?: string
}

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

/**
 * Error code to user-friendly message mapping
 */
function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    too_many_requests: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
    network_error: 'Błąd połączenia. Sprawdź połączenie internetowe.',
  }
  return messages[code] || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'
}

/**
 * Forgot password form component.
 * Sends a password reset email to the user.
 * Does not reveal whether the email exists in the system (security).
 */
export function ForgotPasswordForm() {
  const formId = useId()
  
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [touched, setTouched] = useState(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setEmail(newValue)
    
    // Clear error on change if touched
    if (touched) {
      const fieldError = validateEmail(newValue)
      setErrors({ email: fieldError })
    }
  }, [touched])

  const handleBlur = useCallback(() => {
    setTouched(true)
    const fieldError = validateEmail(email)
    setErrors(prev => ({ ...prev, email: fieldError }))
  }, [email])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    setTouched(true)
    
    // Validate email
    const emailError = validateEmail(email)
    if (emailError) {
      setErrors({ email: emailError })
      const input = document.getElementById(`${formId}-email`)
      input?.focus()
      return
    }
    
    setIsSubmitting(true)
    setErrors({})
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })
      
      // Always show success message (don't reveal if email exists)
      if (response.ok || response.status === 200) {
        setIsSubmitted(true)
        return
      }
      
      // Handle error responses
      const data = await response.json().catch(() => ({}))
      const errorCode = data.code || 'unknown'
      
      if (response.status === 429) {
        setErrors({ form: getErrorMessage('too_many_requests') })
      } else {
        // For security, still show success even on some errors
        // Only show error for rate limiting or server errors
        setIsSubmitted(true)
      }
    } catch (error) {
      console.error('Forgot password error:', error)
      setErrors({ form: getErrorMessage('network_error') })
    } finally {
      setIsSubmitting(false)
    }
  }, [email, formId])

  const emailId = `${formId}-email`
  const emailErrorId = `${formId}-email-error`

  // Show success state
  if (isSubmitted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Sprawdź swoją skrzynkę</CardTitle>
          <CardDescription className="text-base">
            Jeśli konto z podanym adresem email istnieje, wyślemy link do resetowania hasła.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4">
          <a href="/auth/login" className="w-full">
            <Button variant="outline" className="w-full">
              Powrót do logowania
            </Button>
          </a>
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false)
              setEmail('')
              setTouched(false)
            }}
            className="text-sm text-primary hover:underline"
          >
            Wyślij ponownie
          </button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Odzyskiwanie hasła</CardTitle>
        <CardDescription>
          Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła
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
              value={email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="jan@example.com"
              disabled={isSubmitting}
              aria-invalid={touched && !!errors.email}
              aria-describedby={errors.email ? emailErrorId : undefined}
              autoComplete="email"
              autoFocus
            />
            {touched && errors.email && (
              <p id={emailErrorId} className="text-sm text-destructive">
                {errors.email}
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
                Wysyłanie...
              </>
            ) : (
              'Wyślij link'
            )}
          </Button>

          {/* Back to login link */}
          <a 
            href="/auth/login" 
            className="text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Powrót do logowania
          </a>
        </CardFooter>
      </form>
    </Card>
  )
}
