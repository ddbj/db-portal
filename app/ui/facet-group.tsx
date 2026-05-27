import type { ReactNode } from "react"

import { SidebarGroupLabel } from "./sidebar-group-label"

type FacetGroupProps = {
  label: string
  appliedCount?: number
  onClear?: () => void
  showMore?: boolean
  showMoreLabel?: string
  onShowMore?: () => void
  children: ReactNode
}

export const FacetGroup = ({
  label,
  appliedCount = 0,
  onClear,
  showMore = false,
  showMoreLabel = "+ さらに表示",
  onShowMore,
  children,
}: FacetGroupProps) => (
  <div className="mb-5">
    <SidebarGroupLabel
      action={
        appliedCount > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="bg-transparent border-0 text-brand text-fs-micro font-semibold cursor-pointer p-0 font-sans"
          >
            解除
          </button>
        )
      }
    >
      {label}
    </SidebarGroupLabel>
    <ul className="list-none p-0 m-0">{children}</ul>
    {showMore && (
      <button
        type="button"
        onClick={onShowMore}
        className="bg-transparent border-0 text-brand text-fs-label cursor-pointer pt-1.5 font-semibold font-sans"
      >
        {showMoreLabel}
      </button>
    )}
  </div>
)
