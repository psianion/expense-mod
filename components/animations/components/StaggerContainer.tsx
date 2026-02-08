"use client";

import { motion } from "motion/react";
import { ReactNode, forwardRef } from "react";
import { staggerContainer, staggerItem } from "../variants";
import { useReducedMotion } from "../hooks";

interface StaggerContainerProps extends React.ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
  staggerDelay?: number;
  delay?: number;
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, staggerDelay = 0.05, delay = 0.1, className, ...rest }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    if (prefersReducedMotion) {
      return (
        <div ref={ref} className={className} {...rest}>
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
        variants={staggerContainer}
        transition={{
          staggerChildren: staggerDelay,
          delayChildren: delay
        }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }
);

StaggerContainer.displayName = "StaggerContainer";

// Individual item wrapper for stagger animations
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className }, ref) => {
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
        variants={staggerItem}
      >
        {children}
      </motion.div>
    );
  }
);

StaggerItem.displayName = "StaggerItem";


