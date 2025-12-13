import React from 'react'
import { Button } from '../ui/button'
import { Plus } from 'lucide-react'
import { AnimatedIcon, fabHover } from '@/lib/animations'

interface FloatingActionButtonProps {
  onClick: () => void
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
      size="icon"
    >
      <AnimatedIcon
        icon={Plus}
        className="h-6 w-6"
        hoverScale={1.1}
        hoverRotate={90}
      />
    </Button>
  )
}
