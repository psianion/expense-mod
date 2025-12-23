"use client";

import { motion } from "motion/react";
import { LucideIcon, LucideProps } from "lucide-react";
import { forwardRef } from "react";
import { iconHover } from "../variants";
import { useReducedMotion } from "../hooks";

interface AnimatedIconProps extends Omit<LucideProps, "ref"> {
  icon: LucideIcon;
  animate?: boolean;
  hoverScale?: number;
  hoverRotate?: number;
}

export const AnimatedIcon = forwardRef<SVGSVGElement, AnimatedIconProps>(
  ({ icon: Icon, animate = true, hoverScale = 1.1, hoverRotate = 5, className, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    if (!animate || prefersReducedMotion) {
      return <Icon ref={ref} className={className} {...props} />;
    }

    return (
      <motion.div
        className="inline-block"
        whileHover={{
          scale: hoverScale,
          rotate: hoverRotate,
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Icon ref={ref} className={className} {...props} />
      </motion.div>
    );
  }
);

AnimatedIcon.displayName = "AnimatedIcon";


