import type { Node, NodeProps } from "@xyflow/react"
import { Handle, Position } from "@xyflow/react"
import { ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui"
import cn from "@/components/ui/cn"
import type { LeafHighlightState } from "@/lib/submit-alt/node-selectors"
import type { RegistrationVenue } from "@/types/submit-alt"

export type LeafNodeAltData = {
  label: string
  legacyId: string
  goal: string
  venue: RegistrationVenue
  highlight: LeafHighlightState
  isSelected: boolean
} & Record<string, unknown>

export type LeafNodeAltType = Node<LeafNodeAltData, "leaf">

// 内部 (DDBJ/BSI) は emerald 系、外部 (jPOST/EVA/dgVa) は amber 系。
// docs/submit-alt.md L348-356 の色区分に従う。
const LeafNodeAlt = ({ data }: NodeProps<LeafNodeAltType>) => {
  const isInternal = data.venue === "internal"

  const stateClass = data.isSelected
    ? "border-primary-600 bg-primary-50 ring-2 ring-primary-600/40"
    : data.highlight === "active"
      ? isInternal
        ? "border-emerald-400 bg-emerald-50/70"
        : "border-amber-400 bg-amber-50/70"
      : data.highlight === "folded"
        ? "border-gray-200 bg-gray-50/40 opacity-50"
        : isInternal
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-amber-200 bg-amber-50/30"

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
          "text-xs leading-snug font-medium",
          isInternal ? "text-emerald-900" : "text-amber-900",
        )}
      >
        {data.label}
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <span
          className={cn(
            "font-mono text-[10px]",
            isInternal ? "text-emerald-700/70" : "text-amber-700/70",
          )}
        >
          {data.legacyId}
        </span>
        <Badge
          variant={isInternal ? "success" : "warning"}
          size="sm"
          className="text-[10px]"
        >
          {data.goal}
        </Badge>
        {!isInternal && (
          <ExternalLink
            className="h-3 w-3 text-amber-700"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}

export default LeafNodeAlt
