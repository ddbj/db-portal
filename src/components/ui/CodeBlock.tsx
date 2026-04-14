import type { ReactNode } from "react"

interface CodeBlockProps {
  theme?: "dark" | "light"
  children: ReactNode
  className?: string
}

const CodeBlock = ({ theme = "dark", children, className = "" }: CodeBlockProps) => {
  const themeStyle = theme === "dark"
    ? "bg-gray-900 text-gray-100"
    : "border border-gray-200 bg-gray-50 text-gray-800"

  return (
    <pre className={`overflow-x-auto rounded-lg p-4 text-sm leading-relaxed ${themeStyle} ${className}`}>
      <code className="font-mono">{children}</code>
    </pre>
  )
}

const InlineCode = ({ children, className = "" }: { children: ReactNode; className?: string }) => {

  return (
    <code className={`text-primary-700 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs ${className}`}>
      {children}
    </code>
  )
}

export { CodeBlock, InlineCode }
