import type { ButtonHTMLAttributes, ReactNode } from "react"

import { cn } from "./cn"

type SizedButtonKind = "primary" | "secondary" | "danger" | "ghost" | "accent"
type ButtonKind = SizedButtonKind | "link"
type ButtonSize = "sm" | "md" | "lg"

type ButtonHtmlBase = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">

type SizedButtonProps = ButtonHtmlBase & {
  kind?: SizedButtonKind
  size?: ButtonSize
  block?: boolean
  pill?: boolean
  children: ReactNode
}

type LinkButtonProps = ButtonHtmlBase & {
  kind: "link"
  size?: never
  block?: never
  pill?: never
  children: ReactNode
}

type ButtonProps = SizedButtonProps | LinkButtonProps

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-fs-body-sm",
  md: "px-4 py-2 text-fs-body",
  lg: "px-6 py-3 text-fs-body",
}

const kindClass: Record<ButtonKind, string> = {
  primary: "bg-brand text-white border-0",
  secondary: "bg-surface text-ink border border-border-soft",
  danger: "bg-surface text-red border border-red",
  ghost: "bg-transparent text-brand-deep border-0",
  accent: "bg-brand-soft text-brand-deep border border-brand/50",
  link: "bg-transparent text-brand border-0 p-0 font-semibold rounded-none",
}

export const Button = ({
  kind = "primary",
  size,
  block,
  pill,
  disabled,
  type = "button",
  children,
  ...rest
}: ButtonProps) => {
  const sizedClass = kind === "link" ? null : sizeClass[size ?? "md"]
  // `link` keeps its own rounded-none; otherwise pill swaps the default 6px radius
  // for a fully rounded shape.
  const radiusClass = kind === "link" ? null : pill ? "rounded-pill" : "rounded-button"

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold font-sans cursor-pointer leading-none",
        radiusClass,
        sizedClass,
        kindClass[kind],
        block && "w-full justify-start text-left",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      {children}
    </button>
  )
}
