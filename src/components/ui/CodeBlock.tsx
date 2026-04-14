import type { ReactNode } from "react"

import cn from "./cn"

interface CodeBlockProps {
  theme?: "dark" | "light"
  children: ReactNode
  className?: string
}

const CodeBlock = ({ theme = "dark", children, className }: CodeBlockProps) => {

  return (
    <pre className={cn(
      "overflow-x-auto rounded-lg p-4 text-sm leading-relaxed",
      theme === "dark" ? "bg-gray-900 text-gray-100" : "border border-gray-200 bg-gray-50 text-gray-800",
      className,
    )}>
      <code className="font-mono">{children}</code>
    </pre>
  )
}

const InlineCode = ({ children, className }: { children: ReactNode; className?: string }) => {

  return (
    <code className={cn("rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-primary-700", className)}>
      {children}
    </code>
  )
}

export { CodeBlock, InlineCode }
