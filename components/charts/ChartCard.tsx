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
  onFullscreen?: () => void
  className?: string
}

export function ChartCard({ title, description, children, onFullscreen, className }: ChartCardProps) {
  return (
    <Card className={cn("relative", className)}>
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
            onClick={onFullscreen}
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

