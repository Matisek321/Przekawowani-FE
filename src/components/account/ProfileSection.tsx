import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, User } from 'lucide-react'

type ProfileSectionProps = {
  email: string
  displayName: string | null
}

/**
 * Section displaying user profile information (email and display name).
 */
export function ProfileSection({ email, displayName }: ProfileSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Profil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email field */}
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-sm">{email}</p>
          </div>
        </div>

        {/* Display name field */}
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Nazwa wyświetlana
            </p>
            {displayName ? (
              <p className="text-sm">{displayName}</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground italic">
                  Nie ustawiono
                </p>
                <a
                  href="/account/display-name?returnTo=/account"
                  className="text-sm text-primary hover:underline"
                >
                  Ustaw nazwę
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
