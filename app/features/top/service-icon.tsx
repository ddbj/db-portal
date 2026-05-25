import type { SVGProps } from "react"

type ServiceIconProps = SVGProps<SVGSVGElement> & {
  id: string
  size?: number
}

const BASE_STROKE = 1.6

export const ServiceIcon = ({ id, size = 30, ...rest }: ServiceIconProps) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: BASE_STROKE,
    "aria-hidden": true,
    focusable: false,
    ...rest,
  } as const

  switch (id) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15 L 20.5 20.5" strokeLinecap="round" />
        </svg>
      )
    case "submit-nav":
      return (
        <svg {...common}>
          <path d="M12 4 L 12 15" strokeLinecap="round" />
          <path d="M7.5 8 L 12 4 L 16.5 8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 14 L 4 19 C 4 20.1, 4.9 21, 6 21 L 18 21 C 19.1 21, 20 20.1, 20 19 L 20 14" strokeLinejoin="round" />
        </svg>
      )
    case "services-index":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
          <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
        </svg>
      )
    case "supercomputer":
      return (
        <svg {...common}>
          <rect x="3.5" y="4" width="17" height="5" rx="1" />
          <rect x="3.5" y="10" width="17" height="5" rx="1" />
          <rect x="3.5" y="16" width="17" height="5" rx="1" />
          <circle cx="6.6" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="6.6" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="6.6" cy="18.5" r="0.8" fill="currentColor" stroke="none" />
          <path d="M14 6.5 L 18 6.5" strokeLinecap="round" opacity="0.5" />
          <path d="M14 12.5 L 18 12.5" strokeLinecap="round" opacity="0.5" />
          <path d="M14 18.5 L 18 18.5" strokeLinecap="round" opacity="0.5" />
        </svg>
      )
    case "statistics":
      return (
        <svg {...common}>
          <path d="M3.5 20 L 20.5 20" strokeLinecap="round" />
          <rect x="5" y="11" width="3" height="9" />
          <rect x="10.5" y="7" width="3" height="13" />
          <rect x="16" y="14" width="3" height="6" />
        </svg>
      )
    case "activity":
      return (
        <svg {...common}>
          <circle cx="9" cy="9.5" r="3.2" />
          <circle cx="17" cy="10.5" r="2.5" />
          <path d="M3 19 C 4 15.5, 14 15.5, 15 19" strokeLinecap="round" />
          <path d="M15 18 C 16 15.5, 21 15.5, 21 18" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}
