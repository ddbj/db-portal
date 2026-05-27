import type { CSSProperties, ReactNode } from "react"

type PageTitleProps = {
  title: ReactNode
  subtitle?: ReactNode
  eyebrow?: ReactNode
  maxWidth?: number
}

export const PageTitle = ({ title, subtitle, eyebrow, maxWidth }: PageTitleProps) => {
  const inner: CSSProperties | undefined = maxWidth === undefined ? undefined : { maxWidth }

  return (
    <div className="px-page-gutter pt-9 pb-6">
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
          <p className="text-fs-body text-ink-mid leading-relaxed mt-2.5 max-w-[1100px]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
