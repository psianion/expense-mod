import { Variants } from "motion/react";

// Apple-inspired animation variants
// Spring physics: gentle, natural motion
export const springConfig = {
  type: "spring" as const,
  stiffness: 100,
  damping: 20,
  mass: 1,
};

export const gentleSpringConfig = {
  type: "spring" as const,
  stiffness: 80,
  damping: 25,
  mass: 1,
};

// Fade animations
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig
  }
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig
  }
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springConfig
  }
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springConfig
  }
};

// Scale animations
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springConfig
  }
};

export const gentleScale: Variants = {
  hover: {
    scale: 1.02,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1, ease: "easeOut" }
  }
};

// Icon animations
export const iconHover: Variants = {
  hover: {
    scale: 1.1,
    rotate: 5,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1, ease: "easeOut" }
  }
};

// Card animations
export const cardHover: Variants = {
  hover: {
    y: -2,
    boxShadow: "0 8px 25px -8px rgba(0, 0, 0, 0.1)",
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

// Button animations
export const buttonPress: Variants = {
  tap: {
    scale: 0.97,
    transition: { duration: 0.1, ease: "easeOut" }
  }
};

// Stagger animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig
  }
};

// Page transition animations
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] // Custom cubic-bezier for Apple-like motion
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Chart animations
export const chartReveal: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

// Number counting animation (for animated numbers)
export const numberCount: Variants = {
  hidden: { opacity: 0.5 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

// Floating action button
export const fabHover: Variants = {
  hover: {
    scale: 1.05,
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.15)",
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1, ease: "easeOut" }
  }
};

// Modal/Sheet animations
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  }
};

export const modalScale: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springConfig
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15, ease: "easeIn" }
  }
};


