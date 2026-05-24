import type { ReactNode } from "react"
import { Link, type To } from "react-router"

import { cn } from "./cn"

type LinkCardBase = {
  children: ReactNode
  className?: string
}

export type LinkCardProps =
  | (LinkCardBase & { to: To; external?: false; href?: never })
  | (LinkCardBase & { href: string; external: true; to?: never })

const baseClass =
  "block bg-surface border border-border-soft rounded-card text-ink no-underline hover:shadow-card-hover transition-shadow"

export const LinkCard = (props: LinkCardProps) => {
  const className = cn(baseClass, props.className)
  if (props.external) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {props.children}
      </a>
    )
  }

  return (
    <Link to={props.to} className={className}>
      {props.children}
    </Link>
  )
}
