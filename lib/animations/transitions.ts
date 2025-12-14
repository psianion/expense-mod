import { Transition } from "motion/react";

// Apple-inspired transition presets
export const appleEase: Transition = {
  ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier for smooth acceleration/deceleration
  duration: 0.3
};

export const appleEaseFast: Transition = {
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.2
};

export const appleEaseSlow: Transition = {
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.4
};

// Spring transitions for natural motion
export const gentleSpring: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  mass: 1
};

export const bouncySpring: Transition = {
  type: "spring",
  stiffness: 150,
  damping: 15,
  mass: 1
};

export const slowSpring: Transition = {
  type: "spring",
  stiffness: 80,
  damping: 25,
  mass: 1
};

// Opacity transitions
export const fadeTransition: Transition = {
  duration: 0.2,
  ease: "easeOut"
};

export const fadeTransitionSlow: Transition = {
  duration: 0.3,
  ease: "easeOut"
};

// Scale transitions
export const scaleTransition: Transition = {
  duration: 0.15,
  ease: "easeOut"
};

// Stagger transitions
export const staggerTransition = (delay: number = 0.05): Transition => ({
  staggerChildren: delay,
  delayChildren: 0.1
});

// Hover transitions
export const hoverTransition: Transition = {
  duration: 0.2,
  ease: "easeOut"
};

// Press/click transitions
export const pressTransition: Transition = {
  duration: 0.1,
  ease: "easeOut"
};

// Page transition
export const pageTransitionConfig: Transition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94]
};

// Chart animation transition
export const chartTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94]
};

// Number counting transition
export const numberTransition: Transition = {
  duration: 0.3,
  ease: "easeOut"
};

// Modal transition
export const modalTransition: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 25,
  mass: 1
};

// Ripple effect transition (for button presses)
export const rippleTransition: Transition = {
  duration: 0.4,
  ease: "easeOut"
};

// Reduced motion transitions (for accessibility)
export const reducedMotionTransition: Transition = {
  duration: 0.1,
  ease: "linear"
};


