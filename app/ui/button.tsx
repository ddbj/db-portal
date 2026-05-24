import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "./cn"

type SizedButtonKind = "primary" | "secondary" | "danger" | "ghost"
type ButtonKind = SizedButtonKind | "link"
type ButtonSize = "sm" | "md" | "lg"

type ButtonHtmlBase = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">

type SizedButtonProps = ButtonHtmlBase & {
  kind?: SizedButtonKind
  size?: ButtonSize
  children: ReactNode
}

type LinkButtonProps = ButtonHtmlBase & {
  kind: "link"
  size?: never
  children: ReactNode
}

type ButtonProps = SizedButtonProps | LinkButtonProps

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-4.5 py-2.25 text-fs-body",
  lg: "px-5.5 py-2.75 text-[15px]",
}

const kindClass: Record<ButtonKind, string> = {
  primary: "bg-brand text-white border-0",
  secondary: "bg-surface text-ink border border-border-soft",
  danger: "bg-surface text-red border border-red",
  ghost: "bg-transparent text-brand-deep border-0",
  link: "bg-transparent text-brand border-0 p-0 font-semibold rounded-none",
}

export const Button = ({
  kind = "primary",
  size,
  disabled,
  type = "button",
  children,
  ...rest
}: ButtonProps) => {
  const sizedClass = kind === "link" ? null : sizeClass[size ?? "md"]

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-button font-semibold font-sans cursor-pointer",
        sizedClass,
        kindClass[kind],
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      {children}
    </button>
  )
}
