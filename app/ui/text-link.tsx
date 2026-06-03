import type { ReactNode } from "react"
import { Link, type To } from "react-router"

import { cn } from "./cn"
import { ChevronDownIcon, ExternalIcon } from "./icons"

type TextLinkBase = {
  children: ReactNode
  weight?: "normal" | "semibold" | "bold"
  arrow?: boolean
}

type TextLinkProps =
  | (TextLinkBase & { to: To; external?: false; href?: never })
  | (TextLinkBase & { href: string; external: true; to?: never })

const weightClass = {
  normal: "font-normal",
  semibold: "font-semibold",
  bold: "font-bold",
} as const

export const TextLink = (props: TextLinkProps) => {
  const { children, weight = "semibold" } = props
  const className = cn(
    "text-brand no-underline hover:underline inline-flex items-center gap-1",
    weightClass[weight],
  )

  if (props.external) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
        <ExternalIcon size={12} aria-hidden />
        <span className="sr-only">(external link)</span>
      </a>
    )
  }

  return (
    <Link to={props.to} className={className}>
      {children}
      {props.arrow && <ChevronDownIcon size={12} aria-hidden className="-rotate-90" />}
    </Link>
  )
}
