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
  // external 時は sr-only な「外部リンク」 ラベルが言語を持つので caller から
  // 翻訳済み文字列を受ける (ui primitive は i18n 非依存)。
  | (TextLinkBase & { href: string; external: true; externalSrLabel: string; to?: never })

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
        <span className="sr-only">{props.externalSrLabel}</span>
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
