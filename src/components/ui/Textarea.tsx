import type { ComponentProps } from "react"

import cn from "./cn"

type TextareaProps = ComponentProps<"textarea"> & {
  invalid?: boolean
  resize?: "none" | "vertical"
}

const Textarea = ({
  invalid,
  resize = "vertical",
  className,
  ...props
}: TextareaProps) => {

  return (
    <textarea
      className={cn(
        "block w-full rounded-md border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-200",
        resize === "none" ? "resize-none" : "resize-y",
        invalid && "border-red-300 focus:border-red-500 focus:ring-red-200",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export default Textarea
