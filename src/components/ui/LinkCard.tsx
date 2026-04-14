import type { ComponentProps } from "react"
import { Link } from "react-router"

type LinkCardProps = Omit<ComponentProps<typeof Link>, "children"> & {
  title: string
  description: string
  linkText?: string
  color?: "primary" | "secondary"
}

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

const LinkCard = ({
  title,
  description,
  linkText,
  color = "primary",
  className = "",
  ...props
}: LinkCardProps) => {
  const c = colorStyles[color]

  return (
    <Link
      className={`group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:-translate-y-px hover:shadow-md ${c.hover} ${className}`}
      {...props}
    >
      <h4 className={`text-sm font-semibold text-gray-900 ${c.title}`}>{title}</h4>
      <p className="mt-1 text-xs text-gray-600">{description}</p>
      {linkText && (
        <span className={`mt-3 inline-block text-xs font-medium underline underline-offset-2 ${c.link}`}>
          {linkText}
        </span>
      )}
    </Link>
  )
}

export default LinkCard
