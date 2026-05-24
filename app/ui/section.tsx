import type { CSSProperties, ReactNode } from "react"

import { cn } from "./cn"

type SectionProps = {
  children: ReactNode
  padY?: "lg" | "md" | "sm"
  maxWidth?: number
}

const padYClass = {
  lg: "py-section-lg",
  md: "py-section-md",
  sm: "py-section-sm",
} as const

export const Section = ({ children, padY = "md", maxWidth }: SectionProps) => {
  const inner: CSSProperties | undefined = maxWidth === undefined ? undefined : { maxWidth }

  return (
    <section className={cn("px-page-gutter", padYClass[padY])}>
      <div className="max-w-content-max mx-auto" style={inner}>
        {children}
      </div>
    </section>
  )
}
