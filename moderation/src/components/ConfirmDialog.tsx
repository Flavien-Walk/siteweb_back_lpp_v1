import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'warning'
  requireReason?: boolean
  reasonPlaceholder?: string
  reasonMinLength?: number
  isLoading?: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  requireReason = false,
  reasonPlaceholder = 'Entrez une raison...',
  reasonMinLength = 5,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')

  if (!open) return null

  const canConfirm = !requireReason || reason.trim().length >= reasonMinLength

  const handleConfirm = () => {
    onConfirm(reason)
    setReason('')
  }

  const handleCancel = () => {
    setReason('')
    onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCancel}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {variant === 'destructive' && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {variant === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {requireReason && (
              <div>
                <label className="block text-sm font-medium mb-1">Raison *</label>
                <Input
                  placeholder={reasonPlaceholder}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canConfirm && !isLoading) {
                      handleConfirm()
                    }
                  }}
                  autoFocus
                />
                {requireReason && reason.length > 0 && reason.length < reasonMinLength && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum {reasonMinLength} caractères
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button
                variant={variant === 'destructive' ? 'destructive' : variant === 'warning' ? 'warning' as never : 'default'}
                onClick={handleConfirm}
                disabled={!canConfirm || isLoading}
              >
                {isLoading ? 'Chargement...' : confirmLabel}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
