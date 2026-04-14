import type { ComponentProps } from "react"
import { Link } from "react-router"

import cn from "./cn"

const colorStyles = {
  primary: {
    hover: "hover:border-primary-300",
    title: "group-hover:text-primary-700",
    link: "text-primary-600 decoration-primary-200 group-hover:decoration-primary-500",
  },
  secondary: {
    hover: "hover:border-secondary-300",
    title: "group-hover:text-secondary-700",
    link: "text-secondary-600 decoration-secondary-200 group-hover:decoration-secondary-500",
  },
} as const

interface CardContentProps {
  title: string
  description: string
  linkText?: string | undefined
  color: keyof typeof colorStyles
}

const CardContent = ({ title, description, linkText, color }: CardContentProps) => {
  const c = colorStyles[color]

  return (
    <>
      <h4 className={cn("text-sm font-semibold text-gray-900", c.title)}>{title}</h4>
      <p className="mt-1 text-xs text-gray-600">{description}</p>
      {linkText && (
        <span className={cn("mt-3 inline-block text-xs font-medium underline underline-offset-2", c.link)}>
          {linkText}
        </span>
      )}
    </>
  )
}

type LinkCardProps = {
  title: string
  description: string
  linkText?: string | undefined
  color?: keyof typeof colorStyles | undefined
} & (
  | ({ external?: false } & Omit<ComponentProps<typeof Link>, "children">)
  | ({ external: true; href: string } & Omit<ComponentProps<"a">, "children" | "href">)
)

const LinkCard = (props: LinkCardProps) => {
  const { title, description, linkText, color = "primary" } = props
  const c = colorStyles[color]
  const cardClass = cn(
    "group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:-translate-y-px hover:shadow-md",
    c.hover,
  )
  const contentProps: CardContentProps = { title, description, linkText, color }

  if (props.external) {
    const { external: _, title: _t, description: _d, linkText: _l, color: _c, className, ...rest } = props

    return (
      <a className={cn(cardClass, className)} target="_blank" rel="noopener noreferrer" {...rest}>
        <CardContent {...contentProps} />
      </a>
    )
  }

  const { external: _, title: _t, description: _d, linkText: _l, color: _c, className, ...rest } = props

  return (
    <Link className={cn(cardClass, className)} {...rest}>
      <CardContent {...contentProps} />
    </Link>
  )
}

export default LinkCard
