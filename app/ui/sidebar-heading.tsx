import type { ReactNode } from "react"
import { createElement } from "react"

import { cn } from "./cn"

type SidebarHeadingProps = {
  children: ReactNode
  action?: ReactNode
  as?: "h2" | "h3"
  id?: string
  withDivider?: boolean
}

export const SidebarHeading = ({
  children,
  action,
  as = "h3",
  id,
  withDivider = false,
}: SidebarHeadingProps) => (
  <div
    className={cn(
      "flex items-center justify-between gap-2",
      withDivider && "border-b border-border-soft py-2.5 min-h-heading-row",
    )}
  >
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
