import type { ReactNode } from "react"
import { createElement } from "react"

type SectionHeadingProps = {
  children: ReactNode
  count?: number | undefined
  countSuffix?: string
  action?: ReactNode
  as?: "h2" | "h3"
  id?: string
}

export const SectionHeading = ({
  children,
  count,
  countSuffix,
  action,
  as = "h2",
  id,
}: SectionHeadingProps) => (
  <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
    <div className="flex items-baseline gap-2.5 min-w-0">
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
        <span className="text-[12.5px] text-ink-soft">
          {count}{countSuffix === undefined || countSuffix === "" ? "" : ` ${countSuffix}`}
        </span>
      )}
    </div>
    {action}
  </div>
)
