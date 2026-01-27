import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut } from 'lucide-react'

type SessionSectionProps = {
  onLogout: () => Promise<void>
  isLoggingOut: boolean
}

/**
 * Section with session-related actions (logout).
 */
export function SessionSection({ onLogout, isLoggingOut }: SessionSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sesja</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="w-full sm:w-auto"
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wylogowywanie...
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Wyloguj się
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
