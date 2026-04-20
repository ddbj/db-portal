import type { Node, NodeProps } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"

import { Badge } from "@/components/ui"
import cn from "@/components/ui/cn"

export type LeafNodeData = {
  label: string
  goal: string
  leafNumber: number
  isSelected: boolean
  isOnPath: boolean
} & Record<string, unknown>

export type LeafNodeType = Node<LeafNodeData, "leaf">

// leaf node（登録先ゴール）。primary-50 の淡い背景 + goal Badge で他と視覚的に区別。
const LeafNode = ({ data }: NodeProps<LeafNodeType>) => {

  return (
    <div
      className={cn(
        "w-[220px] rounded-lg border px-3 py-2 text-center shadow-sm transition-all",
        data.isSelected
          ? "border-primary-600 bg-primary-100 ring-primary-600/30 ring-2"
          : data.isOnPath
            ? "border-primary-400 bg-primary-50"
            : "border-primary-200 bg-primary-50/60",
      )}
    >
      <Handle type="target" position={Position.Top} className="!border-0 !bg-transparent" />
      <div
        className={cn(
          "text-xs leading-snug font-medium",
          data.isSelected ? "text-primary-900" : "text-primary-800",
        )}
      >
        {data.label}
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <span className="text-primary-600/70 font-mono text-[10px]">
          L{data.leafNumber}
        </span>
        <Badge variant="primary" size="sm" className="text-[10px]">
          {data.goal}
        </Badge>
      </div>
    </div>
  )
}

export default LeafNode
