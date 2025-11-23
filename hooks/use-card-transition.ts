import { useRef, useEffect, useState } from 'react'

interface UseCardTransitionProps {
  isOpen: boolean
  initialRect?: DOMRect | null
  onTransitionEnd?: () => void
}

export function useCardTransition({ isOpen, initialRect, onTransitionEnd }: UseCardTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !contentRef.current || !initialRect) return

    setIsAnimating(true)
    const content = contentRef.current
    const finalRect = content.getBoundingClientRect()
    
    const deltaX = initialRect.left - finalRect.left
    const deltaY = initialRect.top - finalRect.top
    const deltaW = initialRect.width / finalRect.width
    const deltaH = initialRect.height / finalRect.height

    // Set initial transform
    content.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${deltaW}, ${deltaH})`
    content.style.transformOrigin = 'top left'
    content.style.opacity = '0'

    // Force reflow
    void content.offsetWidth

    // Animate to final position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        content.style.transition = 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)'
        content.style.transform = 'translate(0, 0) scale(1, 1)'
        content.style.opacity = '1'
        
        const handleTransitionEnd = () => {
          setIsAnimating(false)
          content.style.transition = ''
          content.style.transform = ''
          content.style.transformOrigin = ''
          content.style.opacity = ''
          content.removeEventListener('transitionend', handleTransitionEnd)
          onTransitionEnd?.()
        }
        
        content.addEventListener('transitionend', handleTransitionEnd, { once: true })
      })
    })
  }, [isOpen, initialRect, onTransitionEnd])

  return { contentRef, isAnimating }
}

