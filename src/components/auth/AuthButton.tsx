import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Loader2, LogOut, User, ChevronDown } from 'lucide-react'

type AuthButtonProps = {
  /** User information if logged in, null otherwise */
  user: {
    id: string
    email: string
  } | null
  /** Optional display name to show instead of email */
  displayName?: string | null
}

/**
 * Authentication button component for the navigation.
 * Shows "Zaloguj się" for unauthenticated users.
 * Shows a dropdown with user info and logout option for authenticated users.
 */
export function AuthButton({ user, displayName }: AuthButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true)
    
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        // Redirect to home page after logout
        window.location.assign('/')
      } else {
        // Still redirect on error - user probably wants to be logged out
        console.error('Logout failed, redirecting anyway')
        window.location.assign('/')
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect on error
      window.location.assign('/')
    }
  }, [])

  // Unauthenticated - show login button
  if (!user) {
    return (
      <Button asChild variant="default" size="sm">
        <a href="/auth/login">Zaloguj się</a>
      </Button>
    )
  }

  // Authenticated - show dropdown
  const displayText = displayName || user.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <User className="h-4 w-4" />
          )}
          <span className="max-w-32 truncate">{displayText}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{displayName || 'Użytkownik'}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Wyloguj się
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
