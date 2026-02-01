import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        // Priority variants
        low: 'border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
        medium: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
        high: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
        critical: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
        // Status variants
        pending: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
        reviewed: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
        action_taken: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
        dismissed: 'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        // Role variants
        user: 'border-transparent bg-gray-100 text-gray-800',
        modo_test: 'border-transparent bg-purple-100 text-purple-800',
        modo: 'border-transparent bg-indigo-100 text-indigo-800',
        admin_modo: 'border-transparent bg-blue-100 text-blue-800',
        super_admin: 'border-transparent bg-rose-100 text-rose-800',
        // Misc
        success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
        warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
        escalated: 'border-transparent bg-red-500 text-white animate-pulse',
        live: 'border-transparent bg-red-500 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
