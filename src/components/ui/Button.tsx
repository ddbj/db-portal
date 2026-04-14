import type { ComponentProps } from "react"

const variantStyles = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-200",
  secondary: "border border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 focus:ring-primary-200",
  tertiary: "border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-gray-300",
  accent: "bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-200",
} as const

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
}

const Button = ({
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  ...props
}: ButtonProps) => {
  const base = "rounded-md font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none transition-colors"
  const disabledStyle = "bg-gray-200 text-gray-400 cursor-not-allowed"

  return (
    <button
      className={`${base} ${sizeStyles[size]} ${disabled ? disabledStyle : variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    />
  )
}

export default Button
