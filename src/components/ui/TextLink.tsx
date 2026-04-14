import type { ComponentProps } from "react"
import { Link } from "react-router"

type TextLinkProps = ComponentProps<typeof Link> & {
  external?: boolean
}

const style = "font-medium text-primary-600 underline decoration-primary-300 underline-offset-2 hover:text-primary-800 hover:decoration-primary-600"

const TextLink = ({ external, className = "", ...props }: TextLinkProps) => {

  if (external) {
    return (
      <a
        href={typeof props.to === "string" ? props.to : ""}
        className={`${style} ${className}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {props.children}
      </a>
    )
  }

  return (
    <Link className={`${style} ${className}`} {...props} />
  )
}

export default TextLink
