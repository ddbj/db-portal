import type { CSSProperties, ReactNode } from "react"

import { cn } from "./cn"

type PageTitlePad = "sm" | "md"

type PageTitleProps = {
  title: ReactNode
  subtitle?: ReactNode
  eyebrow?: ReactNode
  maxWidth?: number
  padTop?: PageTitlePad
  padBottom?: PageTitlePad
}

const padTopClass: Record<PageTitlePad, string> = {
  sm: "pt-6",
  md: "pt-9",
}

const padBottomClass: Record<PageTitlePad, string> = {
  sm: "pb-3",
  md: "pb-6",
}

export const PageTitle = ({
  title,
  subtitle,
  eyebrow,
  maxWidth,
  padTop = "md",
  padBottom = "md",
}: PageTitleProps) => {
  const inner: CSSProperties | undefined = maxWidth === undefined ? undefined : { maxWidth }

  return (
    <div className={cn("px-page-gutter", padTopClass[padTop], padBottomClass[padBottom])}>
      <div className="max-w-content-max mx-auto" style={inner}>
        {eyebrow !== undefined && (
          <div className="text-fs-label text-brand font-bold uppercase tracking-eyebrow font-mono mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="text-fs-h1 font-extrabold text-ink m-0 leading-tight tracking-h1">
          {title}
        </h1>
        {subtitle !== undefined && (
          <p className="text-fs-body text-ink-mid leading-relaxed mt-2.5 max-w-content-narrow">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
