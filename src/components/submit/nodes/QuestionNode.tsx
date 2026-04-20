import type { Node, NodeProps } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"

import cn from "@/components/ui/cn"

export type QuestionNodeData = {
  label: string
  cardLabel: string | null
  isSelected: boolean
  isOnPath: boolean
  isCard: boolean
} & Record<string, unknown>

export type QuestionNodeType = Node<QuestionNodeData, "question">

// 質問 node（中間 node）。白背景 + gray border。選択中 / 経路上 / カード対応の 3 状態を視覚化。
const QuestionNode = ({ data }: NodeProps<QuestionNodeType>) => {

  return (
    <div
      className={cn(
        "w-[220px] rounded-lg border bg-white px-3 py-2 text-center shadow-sm transition-all",
        data.isSelected
          ? "border-primary-600 ring-primary-600/25 ring-2"
          : data.isOnPath
            ? "border-primary-300"
            : data.isCard
              ? "border-primary-200"
              : "border-gray-300",
      )}
    >
      <Handle type="target" position={Position.Top} className="!border-0 !bg-transparent" />
      <div
        className={cn(
          "text-xs leading-snug",
          data.isSelected
            ? "text-primary-900 font-semibold"
            : data.isCard
              ? "text-gray-800 font-medium"
              : "text-gray-700",
        )}
      >
        {data.label}
      </div>
      {data.isCard && data.cardLabel !== null && (
        <div className="text-primary-700/80 mt-0.5 text-[10px] tracking-widest uppercase">
          {data.cardLabel}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!border-0 !bg-transparent" />
    </div>
  )
}

export default QuestionNode
