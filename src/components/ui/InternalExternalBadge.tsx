import { Database, ExternalLink } from "lucide-react"
import type { ReactNode } from "react"

import Badge from "./Badge"
import cn from "./cn"

interface InternalExternalBadgeProps {
  venue: "internal" | "external"
  label?: ReactNode
  className?: string
}

// 内部 (DDBJ/BSI) = success (emerald)、外部 = warning (amber)。SSOT: docs/submit-alt3.md §6.2
const InternalExternalBadge = ({
  venue,
  label,
  className,
}: InternalExternalBadgeProps) => {
  const Icon = venue === "internal" ? Database : ExternalLink

  return (
    <Badge
      variant={venue === "internal" ? "success" : "warning"}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  )
}

export default InternalExternalBadge
