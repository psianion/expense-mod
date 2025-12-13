"use client";

import { motion, type TargetAndTransition } from "motion/react";
import { ReactNode, forwardRef } from "react";
import { scaleIn, cardHover } from "../variants";
import { useReducedMotion } from "../hooks";

interface AnimatedCardProps {
  children: ReactNode;
  hover?: boolean;
  scale?: boolean;
  delay?: number;
  className?: string;
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, hover = true, scale = true, delay = 0, className }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    const variants = scale ? scaleIn : { visible: { opacity: 1 } };
    const hoverVariants = hover ? cardHover : {};

    if (prefersReducedMotion) {
      return (
        <div ref={ref} className={className}>
          {children}
        </div>
      );
    }

    const motionProps = {
      ref,
      className,
      initial: "hidden" as const,
      animate: "visible" as const,
      variants,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
        delay
      }
    };

    if (hover) {
      const hoverAnimation: TargetAndTransition = {
        y: -2,
        boxShadow: "0 8px 25px -8px rgba(0, 0, 0, 0.1)",
        transition: { duration: 0.2, ease: "easeOut" }
      };

      return (
        <motion.div
          {...motionProps}
          whileHover={hoverAnimation}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div {...motionProps}>
        {children}
      </motion.div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";
