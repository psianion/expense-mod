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
  const [isAnimating, setIsAnimating] = React.useState(false)

  React.useEffect(() => {
    if (!open || !initialRect) {
      setIsAnimating(false)
      return
    }

    // Wait for dialog to be in DOM
    const checkAndAnimate = () => {
      const dialogContent = dialogContentRef.current
      if (!dialogContent) {
        requestAnimationFrame(checkAndAnimate)
        return
      }

      setIsAnimating(true)
      
      // Get final position (centered)
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      
      // Calculate card center
      const cardCenterX = initialRect.left + initialRect.width / 2
      const cardCenterY = initialRect.top + initialRect.height / 2
      
      // Calculate deltas
      const deltaX = cardCenterX - centerX
      const deltaY = cardCenterY - centerY
      const deltaW = initialRect.width / 600 // Dialog width is 600px
      const deltaH = initialRect.height / 500 // Dialog height is 500px

      // Set initial state BEFORE it's visible - positioned at card location
      dialogContent.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(${deltaW}, ${deltaH})`
      dialogContent.style.opacity = '0'
      dialogContent.style.willChange = 'transform, opacity'
      dialogContent.style.pointerEvents = 'none'

      // Force layout recalculation
      void dialogContent.offsetWidth

      // Animate to final position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          dialogContent.style.transition = 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)'
          dialogContent.style.transform = 'translate(-50%, -50%) scale(1, 1)'
          dialogContent.style.opacity = '1'
          dialogContent.style.pointerEvents = 'auto'
          
          const handleTransitionEnd = () => {
            setIsAnimating(false)
            dialogContent.style.transition = ''
            dialogContent.style.willChange = ''
            dialogContent.removeEventListener('transitionend', handleTransitionEnd)
          }
          
          dialogContent.addEventListener('transitionend', handleTransitionEnd, { once: true })
        })
      })
    }

    // Start checking immediately
    requestAnimationFrame(checkAndAnimate)
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
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
