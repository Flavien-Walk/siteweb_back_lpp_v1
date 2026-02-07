import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  children: React.ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export function Tooltip({ content, children, side = 'top', delay = 300, className }: TooltipProps) {
  const [show, setShow] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleEnter = () => {
    timeoutRef.current = setTimeout(() => setShow(true), delay)
  }

  const handleLeave = () => {
    clearTimeout(timeoutRef.current)
    setShow(false)
  }

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return (
    <div className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs',
              'bg-popover border border-border text-popover-foreground shadow-lg',
              positions[side],
              className
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}