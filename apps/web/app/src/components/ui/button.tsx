"use client";

import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import { motion } from "motion/react";

import { Spinner } from "./spinner";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost";

type ButtonSize = "sm" | "md" | "lg";

type MotionButtonProps =
  ComponentPropsWithoutRef<typeof motion.button>;

interface ButtonProps
  extends Omit<
    MotionButtonProps,
    "children"
  > {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<
  ButtonVariant,
  string
> = {
  primary:
    "bg-gradient-to-r from-[#0c4f38] to-[#138153] text-white shadow-[0_14px_30px_rgba(12,79,56,0.22)] hover:shadow-[0_18px_36px_rgba(12,79,56,0.28)]",

  secondary:
    "border border-[#d7e0d9] bg-white text-[#4e5b53] hover:bg-[#f7faf8]",

  danger:
    "bg-[#df4545] text-white hover:bg-[#c93838]",

  ghost:
    "bg-transparent text-[#4e5b53] hover:bg-[#edf4ef]",
};

const sizeClasses: Record<
  ButtonSize,
  string
> = {
  sm: "min-h-10 px-4 text-xs",
  md: "min-h-12 px-5 text-sm",
  lg: "min-h-14 px-6 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  disabled = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled =
    disabled || isLoading;

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      whileHover={
        isDisabled
          ? undefined
          : {
              y: -2,
            }
      }
      whileTap={
        isDisabled
          ? undefined
          : {
              scale: 0.98,
            }
      }
      className={`
        inline-flex items-center
        justify-center gap-2
        rounded-2xl font-semibold
        transition duration-200
        disabled:cursor-not-allowed
        disabled:opacity-60
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {isLoading && (
        <Spinner
          size="sm"
          className="shrink-0"
        />
      )}

      {children}
    </motion.button>
  );
}