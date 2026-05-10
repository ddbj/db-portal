import type { Node, NodeProps } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"

import cn from "@/components/ui/cn"
import type { LeafHighlightState } from "@/lib/submit-alt/node-selectors"

export type QuestionNodeAltData = {
  label: string
  isRoot: boolean
  highlight: LeafHighlightState
  isSelected: boolean
} & Record<string, unknown>

export type QuestionNodeAltType = Node<QuestionNodeAltData, "question">

const QuestionNodeAlt = ({ data }: NodeProps<QuestionNodeAltType>) => {
  const stateClass = data.isSelected
    ? "border-primary-600 bg-primary-50/60 ring-2 ring-primary-600/30"
    : data.highlight === "emphasized" || data.highlight === "active"
      ? "border-primary-400 bg-white"
      : data.highlight === "folded"
        ? "border-gray-200 bg-gray-50/40 opacity-50"
        : data.isRoot
          ? "border-primary-300 bg-white"
          : "border-gray-300 bg-white"

  return (
    <div
      className={cn(
        "w-[220px] rounded-lg border px-3 py-2 text-center shadow-sm transition-all",
        stateClass,
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!border-0 !bg-transparent"
      />
      <div
        className={cn(
          "text-xs leading-snug",
          data.isRoot ? "font-semibold text-gray-800" : "text-gray-700",
        )}
      >
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-0 !bg-transparent"
      />
    </div>
  )
}

export default QuestionNodeAlt
