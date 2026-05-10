import { ExternalLink } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import { Link } from "react-router"

import cn from "./cn"

const colorStyles = {
  primary: {
    hover: "hover:border-primary-300",
    title: "group-hover:text-primary-700",
    link: "text-primary-600 decoration-primary-200 group-hover:decoration-primary-500",
    iconBg: "bg-primary-50 text-primary-600 group-hover:bg-primary-100",
  },
  secondary: {
    hover: "hover:border-secondary-300",
    title: "group-hover:text-secondary-700",
    link: "text-secondary-600 decoration-secondary-200 group-hover:decoration-secondary-500",
    iconBg: "bg-secondary-50 text-secondary-600 group-hover:bg-secondary-100",
  },
} as const

interface CardContentProps {
  title: string
  description: string
  linkText?: string | undefined
  color: keyof typeof colorStyles
  icon?: ReactNode | undefined
  external?: boolean | undefined
}

const CardContent = ({ title, description, linkText, color, icon, external }: CardContentProps) => {
  const c = colorStyles[color]

  return (
    <>
      {icon && (
        <div
          className={cn(
            "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors",
            c.iconBg,
          )}
        >
          {icon}
        </div>
      )}
      <h4 className={cn("text-sm font-semibold text-gray-900", c.title)}>{title}</h4>
      <p className="mt-1 text-xs text-gray-600">{description}</p>
      {linkText && (
        <span
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2",
            c.link,
          )}
        >
          {linkText}
          {external && <ExternalLink className="h-3 w-3" aria-hidden="true" />}
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
  icon?: ReactNode | undefined
} & (
  | ({ external?: false } & Omit<ComponentProps<typeof Link>, "children" | "title">)
  | ({ external: true; href: string } & Omit<ComponentProps<"a">, "children" | "href" | "title">)
)

const LinkCard = (props: LinkCardProps) => {
  const { title, description, linkText, color = "primary", icon } = props
  const cardClass = cn(
    "group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:-translate-y-px hover:shadow-md",
    colorStyles[color].hover,
  )
  const contentProps: CardContentProps = {
    title,
    description,
    linkText,
    color,
    icon,
    external: props.external,
  }

  if (props.external) {
    const { external: _, title: _t, description: _d, linkText: _l, color: _c, icon: _i, className, ...rest } = props

    return (
      <a className={cn(cardClass, className)} target="_blank" rel="noopener noreferrer" {...rest}>
        <CardContent {...contentProps} />
      </a>
    )
  }

  const { external: _, title: _t, description: _d, linkText: _l, color: _c, icon: _i, className, ...rest } = props

  return (
    <Link className={cn(cardClass, className)} {...rest}>
      <CardContent {...contentProps} />
    </Link>
  )
}

export default LinkCard
