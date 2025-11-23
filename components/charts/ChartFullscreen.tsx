"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Drawer } from "@/components/ui/drawer"
import { useCardTransition } from "@/hooks/use-card-transition"

interface ChartFullscreenProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  filters?: React.ReactNode
  initialRect?: DOMRect | null
}

export function ChartFullscreen({
  open,
  onOpenChange,
  title,
  children,
  filters,
  initialRect,
}: ChartFullscreenProps) {
  const isMobile = useIsMobile()
  const dialogContentRef = React.useRef<HTMLDivElement>(null)

  const { contentRef, isAnimating } = useCardTransition({
    isOpen: open,
    initialRect,
  })

  React.useEffect(() => {
    if (!open || !initialRect || !dialogContentRef.current) return

    // Wait for Dialog to render
    const timeoutId = setTimeout(() => {
      const dialogContent = dialogContentRef.current
      if (!dialogContent) return

      const finalRect = dialogContent.getBoundingClientRect()
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      
      // Calculate deltas from card position to center
      const deltaX = initialRect.left + initialRect.width / 2 - centerX
      const deltaY = initialRect.top + initialRect.height / 2 - centerY
      const deltaW = initialRect.width / finalRect.width
      const deltaH = initialRect.height / finalRect.height

      // Set initial transform - start from card position
      dialogContent.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(${deltaW}, ${deltaH})`
      dialogContent.style.opacity = '0'

      // Force reflow
      void dialogContent.offsetWidth

      // Animate to final position (centered)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          dialogContent.style.transition = 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)'
          dialogContent.style.transform = 'translate(-50%, -50%) scale(1, 1)'
          dialogContent.style.opacity = '1'
          
          const handleTransitionEnd = () => {
            dialogContent.style.transition = ''
            dialogContent.removeEventListener('transitionend', handleTransitionEnd)
          }
          
          dialogContent.addEventListener('transitionend', handleTransitionEnd, { once: true })
        })
      })
    }, 10)

    return () => clearTimeout(timeoutId)
  }, [open, initialRect])

  if (isMobile) {
    return (
      <Drawer 
        open={open} 
        onOpenChange={onOpenChange} 
        title={title}
      >
        <div className="flex flex-col">
          {filters && (
            <div className="mb-4 pb-4 border-b">
              {filters}
            </div>
          )}
          <div className="min-h-[50vh]">
            {children}
          </div>
        </div>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={dialogContentRef}
        className="w-[600px] h-[500px] max-w-[600px] max-h-[500px] flex flex-col p-0 data-[state=open]:animate-none data-[state=closed]:animate-none"
        style={{ 
          animation: 'none',
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col flex-1 overflow-hidden">
          {filters && (
            <div className="px-6 py-4 border-b">
              {filters}
            </div>
          )}
          <div ref={contentRef} className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
