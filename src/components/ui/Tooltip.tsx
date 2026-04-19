import { cloneElement, isValidElement, type ReactElement, type ReactNode, useId } from "react"

import cn from "./cn"

const sideStyles = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
} as const

interface TooltipProps {
  content: ReactNode
  children: ReactElement
  side?: keyof typeof sideStyles
  className?: string
}

const Tooltip = ({ content, children, side = "top", className }: TooltipProps) => {
  const id = useId()
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
      "aria-describedby": id,
    })
    : children

  return (
    <span className="group relative inline-block">
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute z-30 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
          sideStyles[side],
          className,
        )}
      >
        {content}
      </span>
    </span>
  )
}

export default Tooltip
