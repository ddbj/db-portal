import type { ReactNode } from "react"
import { createElement } from "react"

import { cn } from "./cn"

type HeadingScale = "h2" | "h3"

type HeadingProps = {
  children: ReactNode
  // Outline level (the rendered element). `size` controls the visual scale
  // independently, so an h3 in the document outline can still read at the h2
  // scale where the layout calls for it.
  as?: HeadingScale
  size?: HeadingScale
  // Brand left bar. Marks a section / document heading; card and panel titles
  // leave it off.
  bar?: boolean
  id?: string | undefined
  className?: string
}

// Single source of the heading recipe: weight, ink color, and tight leading are
// fixed here so every section and card title shares one rhythm. Result and news
// item titles are a separate, looser recipe (leading-snug) and do not use this.
const scaleClass: Record<HeadingScale, string> = {
  h2: "text-fs-h2",
  h3: "text-fs-h3 tracking-h3",
}

export const Heading = ({ children, as = "h2", size, bar = false, id, className }: HeadingProps) =>
  createElement(
    as,
    {
      id,
      className: cn(
        "font-bold text-ink m-0 leading-tight",
        scaleClass[size ?? as],
        bar && "pl-2.5 border-l-[3px] border-brand",
        className,
      ),
    },
    children,
  )
