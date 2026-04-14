import type { ReactNode } from "react"

import cn from "./cn"

interface ProseProps {
  children: ReactNode
  className?: string
}

const Prose = ({ children, className }: ProseProps) => {

  return (
    <div className={cn("prose-ddbj", className)}>
      {children}
    </div>
  )
}

export default Prose
