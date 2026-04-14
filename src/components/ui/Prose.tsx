import type { ReactNode } from "react"

interface ProseProps {
  children: ReactNode
  className?: string
}

const Prose = ({ children, className = "" }: ProseProps) => {

  return (
    <div className={`prose-ddbj ${className}`}>
      {children}
    </div>
  )
}

export default Prose
