"use client";

import { motion } from "motion/react";
import { ReactNode, forwardRef } from "react";
import { fadeInUp, fadeInDown, fadeInLeft, fadeInRight } from "../variants";
import { appleEase } from "../transitions";
import { useReducedMotion } from "../hooks";

interface SlideInProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
}

export const SlideIn = forwardRef<HTMLDivElement, SlideInProps>(
  ({ children, direction = "up", delay = 0, duration = 0.3, className }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    if (prefersReducedMotion) {
      return (
        <div ref={ref} className={className}>
          {children}
        </div>
      );
    }

    const variants = {
      up: fadeInUp,
      down: fadeInDown,
      left: fadeInLeft,
      right: fadeInRight,
    };

    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate="visible"
        variants={variants[direction]}
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

SlideIn.displayName = "SlideIn";
