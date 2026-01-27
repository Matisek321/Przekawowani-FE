import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { DeleteAccountDialog } from './DeleteAccountDialog'

type DangerZoneProps = {
  onDeleteAccount: () => Promise<void>
  isDeleting: boolean
  deleteError: string | null
  isDeleteDialogOpen: boolean
  onDeleteDialogOpenChange: (open: boolean) => void
}

/**
 * Danger zone section with destructive actions (account deletion).
 */
export function DangerZone({
  onDeleteAccount,
  isDeleting,
  deleteError,
  isDeleteDialogOpen,
  onDeleteDialogOpenChange,
}: DangerZoneProps) {
  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Strefa niebezpieczna
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Po usunięciu konta wszystkie Twoje dane zostaną trwale usunięte,
              w tym Twój profil i wszystkie wystawione oceny kaw. Ta akcja jest
              nieodwracalna.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => onDeleteDialogOpenChange(true)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń konto
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={onDeleteDialogOpenChange}
        onConfirm={onDeleteAccount}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </>
  )
}
