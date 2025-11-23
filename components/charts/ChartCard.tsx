"use client"

import * as React from "react"
import { Maximize2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  onFullscreen?: (element: HTMLElement) => void
  className?: string
}

export const ChartCard = React.forwardRef<HTMLDivElement, ChartCardProps>(
  ({ title, description, children, onFullscreen, className }, ref) => {
    const internalRef = React.useRef<HTMLDivElement | null>(null)
    
    const combinedRef = React.useCallback((node: HTMLDivElement | null) => {
      internalRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref && 'current' in ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    }, [ref])

    const handleFullscreen = () => {
      if (onFullscreen && internalRef.current) {
        onFullscreen(internalRef.current)
      }
    }

    return (
      <Card ref={combinedRef} className={cn("relative", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex-1">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {onFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleFullscreen}
              aria-label="Open in fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {children}
        </CardContent>
      </Card>
    )
  }
)
ChartCard.displayName = "ChartCard"

