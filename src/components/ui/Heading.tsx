import type { ComponentProps } from "react"

import cn from "./cn"

const levelClass = {
  1: "heading-1",
  2: "heading-2",
  3: "heading-3",
  4: "heading-4",
} as const

type Level = keyof typeof levelClass

interface HeadingProps extends Omit<ComponentProps<"h1">, "className"> {
  level: Level
  className?: string
}

const Heading = ({ level, className, children, ...rest }: HeadingProps) => {
  const Tag = `h${level}` as const

  return (
    <Tag className={cn(levelClass[level], className)} {...rest}>
      {children}
    </Tag>
  )
}

export default Heading
