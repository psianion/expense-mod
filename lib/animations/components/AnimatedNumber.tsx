"use client";

import { motion } from "motion/react";
import { forwardRef, useEffect, useState } from "react";
import { numberCount } from "../variants";
import { useReducedMotion, useAnimatedNumber } from "../hooks";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedNumber = forwardRef<HTMLSpanElement, AnimatedNumberProps>(
  ({ value, duration = 1000, prefix = "", suffix = "", decimals = 0, className }, ref) => {
    const prefersReducedMotion = useReducedMotion();
    const { currentValue } = useAnimatedNumber(value, duration);

    const formatNumber = (num: number) => {
      return num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };

    if (prefersReducedMotion) {
      return (
        <span ref={ref} className={className}>
          {prefix}{formatNumber(value)}{suffix}
        </span>
      );
    }

    return (
      <motion.span
        ref={ref}
        className={className}
        initial="hidden"
        animate="visible"
        variants={numberCount}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {prefix}{formatNumber(currentValue)}{suffix}
      </motion.span>
    );
  }
);

AnimatedNumber.displayName = "AnimatedNumber";


