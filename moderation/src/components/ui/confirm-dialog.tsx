import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
import { Button } from './button'
import { AlertTriangle, Trash2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  isLoading?: boolean
  onConfirm: () => void
  children?: React.ReactNode
}

const variantConfig = {
  default: {
    icon: Shield,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    buttonVariant: 'default' as const,
  },
  destructive: {
    icon: Trash2,
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10',
    buttonVariant: 'destructive' as const,
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-500/10',
    buttonVariant: 'warning' as const,
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'default',
  isLoading = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', config.iconBg)}>
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </div>
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {children && <div className="mt-4">{children}</div>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}