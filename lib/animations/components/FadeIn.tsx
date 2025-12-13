"use client";

import { motion } from "motion/react";
import { ReactNode, forwardRef } from "react";
import { fadeIn } from "../variants";
import { appleEase } from "../transitions";
import { useReducedMotion } from "../hooks";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, duration = 0.3, className }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    if (prefersReducedMotion) {
      return (
        <div ref={ref} className={className}>
          {children}
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        transition={{
          ...appleEase,
          duration,
          delay
        }}
      >
        {children}
      </motion.div>
    );
  }
);

FadeIn.displayName = "FadeIn";
