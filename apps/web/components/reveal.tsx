"use client";

import { motion } from "motion/react";

export function Reveal({
  children,
  className,
  delay = 0,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  ariaLabel?: string;
}) {
  return (
    <motion.div
      className={className}
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ delay, duration: 0.38 }}
    >
      {children}
    </motion.div>
  );
}
