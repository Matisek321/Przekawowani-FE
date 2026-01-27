import { useState, useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'

const CONFIRMATION_WORD = 'USUŃ'

type DeleteAccountDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
  error: string | null
}

/**
 * Dialog for confirming account deletion.
 * Requires typing "USUŃ" to enable the delete button.
 */
export function DeleteAccountDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting,
  error,
}: DeleteAccountDialogProps) {
  const [confirmationText, setConfirmationText] = useState('')

  const isValid = confirmationText === CONFIRMATION_WORD

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Reset confirmation text when closing
        setConfirmationText('')
      }
      onOpenChange(open)
    },
    [onOpenChange]
  )

  const handleConfirm = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      if (!isValid || isDeleting) return
      await onConfirm()
    },
    [isValid, isDeleting, onConfirm]
  )

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Usuń konto
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="font-medium text-foreground">
                Ta akcja jest nieodwracalna. Po usunięciu konta:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Wszystkie Twoje oceny kaw zostaną usunięte</li>
                <li>Twój profil zostanie trwale usunięty</li>
                <li>Nie będziesz mógł odzyskać dostępu do konta</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Wpisz <span className="font-bold">{CONFIRMATION_WORD}</span> aby potwierdzić
            </Label>
            <Input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={CONFIRMATION_WORD}
              disabled={isDeleting}
              autoComplete="off"
              aria-describedby="confirmation-hint"
            />
            <p id="confirmation-hint" className="text-xs text-muted-foreground">
              Wpisz dokładnie "{CONFIRMATION_WORD}" (wielkość liter ma znaczenie)
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValid || isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Usuwanie...
              </>
            ) : (
              'Usuń konto'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
