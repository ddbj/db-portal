import { Search } from "lucide-react"
import { type FormEvent, type ReactNode, useState } from "react"

import Button from "./Button"
import Chip from "./Chip"
import cn from "./cn"

interface ExampleChip {
  label: string
  query: string
}

interface SearchBoxProps {
  size: "large" | "small"
  defaultValue?: string
  placeholder?: string
  helperText?: ReactNode
  examples?: readonly ExampleChip[]
  onSubmit: (query: string) => void
  className?: string
  buttonLabel?: string
}

const SearchBox = ({
  size,
  defaultValue = "",
  placeholder,
  helperText,
  examples,
  onSubmit,
  className,
  buttonLabel = "検索",
}: SearchBoxProps) => {
  const [value, setValue] = useState(defaultValue)
  const isLarge = size === "large"

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(value)
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex w-full items-stretch gap-2">
        <div className="relative flex-1">
          <Search
            className={cn(
              "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400",
              isLarge ? "h-5 w-5" : "h-4 w-4",
            )}
            aria-hidden="true"
          />
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className={cn(
              "block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-200",
              isLarge ? "py-3 pr-3 pl-10 text-base" : "py-2 pr-3 pl-9 text-sm",
            )}
          />
        </div>
        <Button type="submit" size={isLarge ? "lg" : "md"}>
          {buttonLabel}
        </Button>
      </form>
      {helperText && (
        <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      )}
      {examples && examples.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <Chip
              key={ex.label}
              variant="default"
              onClick={() => {
                setValue(ex.query)
                onSubmit(ex.query)
              }}
            >
              {ex.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchBox
