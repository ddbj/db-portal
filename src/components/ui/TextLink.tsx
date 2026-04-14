import type { ComponentProps } from "react"
import { Link } from "react-router"

import cn from "./cn"

const baseStyle = "font-medium text-primary-600 underline decoration-primary-300 underline-offset-2 hover:text-primary-800 hover:decoration-primary-600"

type InternalLinkProps = ComponentProps<typeof Link> & {
  external?: false
}

type ExternalLinkProps = Omit<ComponentProps<"a">, "href"> & {
  external: true
  href: string
}

type TextLinkProps = InternalLinkProps | ExternalLinkProps

const TextLink = (props: TextLinkProps) => {
  if (props.external) {
    const { external: _, className, ...rest } = props

    return (
      <a
        className={cn(baseStyle, className)}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      />
    )
  }

  const { external: _, className, ...rest } = props

  return (
    <Link className={cn(baseStyle, className)} {...rest} />
  )
}

export default TextLink
