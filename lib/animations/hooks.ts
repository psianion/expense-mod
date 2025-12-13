"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

// Hook for scroll-triggered animations
export function useScrollAnimation(options?: {
  threshold?: number;
  triggerOnce?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    threshold: options?.threshold ?? 0.1,
    once: options?.triggerOnce ?? true,
  });

  return { ref, isInView };
}

// Hook for staggered animations
export function useStagger(delay: number = 0.05) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { threshold: 0.1, once: true });

  useEffect(() => {
    if (inView) {
      setIsVisible(true);
    }
  }, [inView]);

  return {
    ref,
    isVisible,
    staggerDelay: delay
  };
}

// Hook for animated number counting
export function useAnimatedNumber(
  endValue: number,
  duration: number = 1000,
  startValue: number = 0
) {
  const [currentValue, setCurrentValue] = useState(startValue);
  const [isAnimating, setIsAnimating] = useState(false);

  const animate = () => {
    setIsAnimating(true);
    const startTime = Date.now();
    const difference = endValue - startValue;

    const animateStep = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (easeOut)
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setCurrentValue(startValue + difference * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateStep);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animateStep);
  };

  useEffect(() => {
    if (endValue !== startValue) {
      animate();
    }
  }, [endValue, startValue, duration]);

  return { currentValue, isAnimating, animate };
}

// Hook for reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// Hook for hover states with smooth transitions
export function useSmoothHover() {
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  return { isHovered, hoverProps };
}

// Hook for press states (for buttons, cards, etc.)
export function usePressState() {
  const [isPressed, setIsPressed] = useState(false);

  const pressProps = {
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
  };

  return { isPressed, pressProps };
}

// Hook for mounting animations with delay
export function useMountAnimation(delay: number = 0) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return isMounted;
}

// Hook for sequential animations
export function useSequentialAnimation(steps: number, interval: number = 100) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentStep < steps) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, interval);

      return () => clearTimeout(timer);
    }
  }, [currentStep, steps, interval]);

  return currentStep;
}


