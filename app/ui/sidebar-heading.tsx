import type { ReactNode } from "react"
import { createElement } from "react"

type SidebarHeadingProps = {
  children: ReactNode
  action?: ReactNode
  as?: "h2" | "h3"
  id?: string
}

export const SidebarHeading = ({
  children,
  action,
  as = "h3",
  id,
}: SidebarHeadingProps) => (
  <div className="flex items-center justify-between mb-3 gap-2">
    {createElement(
      as,
      {
        id,
        className:
          "text-fs-h3 font-bold text-ink m-0 tracking-h3 leading-tight pl-2.5 border-l-[3px] border-brand",
      },
      children,
    )}
    {action}
  </div>
)
