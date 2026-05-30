import type { ReactNode } from "react"
import { createElement } from "react"

type SectionHeadingProps = {
  children: ReactNode
  subtitle?: ReactNode
  count?: number | undefined
  countSuffix?: string
  action?: ReactNode
  as?: "h2" | "h3"
  id?: string
}

export const SectionHeading = ({
  children,
  subtitle,
  count,
  countSuffix,
  action,
  as = "h2",
  id,
}: SectionHeadingProps) => (
  <div className="flex flex-col gap-1.5 mb-3">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        {createElement(
          as,
          {
            id,
            className:
              "text-fs-h2 font-bold text-ink m-0 pl-2.5 border-l-[3px] border-brand leading-tight",
          },
          children,
        )}
        {count !== undefined && (
          <span className="text-fs-label text-ink-soft">
            {count}{countSuffix === undefined || countSuffix === "" ? "" : ` ${countSuffix}`}
          </span>
        )}
      </div>
      {action}
    </div>
    {subtitle !== undefined && (
      <p className="text-fs-body-sm text-ink-mid m-0 pl-2.5">{subtitle}</p>
    )}
  </div>
)
