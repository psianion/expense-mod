"use client";

import { motion } from "motion/react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useReducedMotion } from "../hooks";

interface AnimatedButtonProps extends ButtonProps {
  animate?: boolean;
}

export const AnimatedButton = ({
  animate = true,
  children,
  ...props
}: AnimatedButtonProps) => {
  const prefersReducedMotion = useReducedMotion();

  if (!animate || prefersReducedMotion) {
    return <Button {...props}>{children}</Button>;
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1, ease: "easeOut" }}
    >
      <Button {...props}>{children}</Button>
    </motion.div>
  );
};


