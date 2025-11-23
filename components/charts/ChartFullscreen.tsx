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
}

export function ChartFullscreen({
  open,
  onOpenChange,
  title,
  children,
  filters,
}: ChartFullscreenProps) {
  const isMobile = useIsMobile()

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
      <DialogContent className="w-[600px] h-[500px] max-w-[600px] max-h-[500px] flex flex-col p-0">
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
