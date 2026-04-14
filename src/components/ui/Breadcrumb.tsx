import type { ReactNode } from "react"
import { Link } from "react-router"

import cn from "./cn"

interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  ariaLabel?: string
  className?: string
}

const Breadcrumb = ({ items, ariaLabel = "パンくずリスト", className }: BreadcrumbProps) => {

  return (
    <nav aria-label={ariaLabel} className={cn("text-xs text-gray-500", className)}>
      {items.map((item, i) => (
        <span key={item.label}>
          {i > 0 && <span className="mx-1.5">/</span>}
          {item.to ? (
            <Link
              to={item.to}
              className="text-primary-600 decoration-primary-200 hover:text-primary-800 hover:decoration-primary-600 underline underline-offset-2"
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export default Breadcrumb

interface BreadcrumbPageProps {
  items: BreadcrumbItem[]
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

const BreadcrumbPage = ({ items, title, description, children, className }: BreadcrumbPageProps) => {

  return (
    <div className={className}>
      <Breadcrumb items={items} />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
      {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
      {children}
    </div>
  )
}

export { Breadcrumb, BreadcrumbPage }
