import type { SVGProps } from "react"

type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill" | "stroke"> & {
  size?: number
  title?: string
}

const baseProps = (size: number, title: string | undefined): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": title === undefined,
  role: title === undefined ? "presentation" : "img",
  "aria-label": title,
  focusable: false,
})

export const ChevronDownIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export const CloseIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
)

export const SearchIcon = ({ size = 16, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16.65" y2="16.65" />
  </svg>
)

export const GlobeIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <circle cx="12" cy="12" r="9" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <path d="M12 3 a12 12 0 0 1 0 18 a12 12 0 0 1 0 -18 z" />
  </svg>
)

export const UserIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21 a8 8 0 0 1 16 0" />
  </svg>
)

export const ExternalIcon = ({ size = 12, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <path d="M14 4 H20 V10" />
    <line x1="20" y1="4" x2="11" y2="13" />
    <path d="M18 14 V18 a2 2 0 0 1 -2 2 H6 a2 2 0 0 1 -2 -2 V8 a2 2 0 0 1 2 -2 H10" />
  </svg>
)

export const InfoIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <circle cx="12" cy="7.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
)

export const AlertIcon = ({ size = 16, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <path d="M12 4 L21 19.5 H3 Z" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export const CheckIcon = ({ size = 16, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <polyline points="4 12 9.5 17.5 20 6.5" />
  </svg>
)

export const HelpIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

export const LockClosedIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" fill="currentColor" stroke="none" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export const LockOpenIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0" />
  </svg>
)

export const ArrowLeftIcon = ({ size = 14, title, ...rest }: IconProps) => (
  <svg {...baseProps(size, title)} {...rest}>
    <line x1="20" y1="12" x2="4" y2="12" />
    <polyline points="11 5 4 12 11 19" />
  </svg>
)
