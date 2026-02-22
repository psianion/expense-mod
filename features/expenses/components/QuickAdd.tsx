import React, { useState } from 'react'
import { Button } from '@components/ui/button'
import { Textarea } from '@components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Loader2 } from 'lucide-react'
import { AnimatedCard, SlideIn } from '@/components/animations'
import { cn } from '@/lib/utils'

interface QuickAddProps {
  onParse: (text: string) => Promise<void>
  isLoading: boolean
  className?: string
}

export function QuickAdd({ onParse, isLoading, className }: QuickAddProps) {
  const [text, setText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    await onParse(text.trim())
    setText('')
  }

  return (
    <SlideIn className={cn(className)}>
      <AnimatedCard>
        <CardHeader>
          <CardTitle>Quick Add Expense</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter a free-text description and let AI parse it for you
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="e.g., 20 rupees chips Swiggy Kerala trip by card"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] transition-all duration-200 focus:scale-[1.01]"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                'Parse & Preview'
              )}
            </Button>
          </form>
        </CardContent>
      </AnimatedCard>
    </SlideIn>
  )
}
