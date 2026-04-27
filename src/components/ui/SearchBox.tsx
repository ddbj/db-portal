import { ChevronDown, Search } from "lucide-react"
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"

import Button from "./Button"
import Chip from "./Chip"
import cn from "./cn"
import type { SelectOption } from "./Select"

export interface ExampleChip {
  label: string
  query: string
}

interface SearchBoxProps {
  size: "large" | "small"
  defaultValue?: string
  placeholder?: string
  hintText?: ReactNode
  helperText?: ReactNode
  examples?: readonly ExampleChip[]
  onSubmit: (query: string) => void
  className?: string
  buttonLabel?: string
  dbOptions?: readonly SelectOption[]
  selectedDb?: string
  onDbChange?: (db: string) => void
  dbAriaLabel?: string
}

interface DbDropdownProps {
  options: readonly SelectOption[]
  value?: string | undefined
  onChange?: ((db: string) => void) | undefined
  ariaLabel?: string | undefined
}

const DbDropdown = ({ options, value, onChange, ariaLabel }: DbDropdownProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selectedLabel = options.find((o) => o.value === value)?.label ?? options[0]?.label ?? ""

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)

    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        className="flex h-full w-auto min-w-28 items-center justify-between gap-2 bg-transparent px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute top-full left-0 z-20 mt-2 max-h-72 w-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1.5 text-sm shadow-lg ring-1 ring-black/5"
        >
          {options.map((opt) => {
            const selected = opt.value === value

            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange?.(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  "cursor-pointer px-4 py-2 transition-colors",
                  selected
                    ? "bg-primary-50 text-primary-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50",
                )}
              >
                {opt.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const SearchBox = ({
  size,
  defaultValue = "",
  placeholder,
  hintText,
  helperText,
  examples,
  onSubmit,
  className,
  buttonLabel = "検索",
  dbOptions,
  selectedDb,
  onDbChange,
  dbAriaLabel,
}: SearchBoxProps) => {
  const [value, setValue] = useState(defaultValue)
  const isLarge = size === "large"
  const showDbSelector = isLarge && dbOptions !== undefined && dbOptions.length > 0

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(value)
  }

  const exampleRow = examples && examples.length > 0
    ? (
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
    )
    : null

  if (showDbSelector) {

    return (
      <div className={className}>
        <form
          onSubmit={handleSubmit}
          className="focus-within:border-primary-500 focus-within:ring-primary-200 flex w-full items-stretch overflow-visible rounded-xl border border-gray-300 bg-white shadow-sm transition focus-within:ring-2"
        >
          <DbDropdown
            options={dbOptions}
            value={selectedDb}
            onChange={onDbChange}
            ariaLabel={dbAriaLabel}
          />
          <div className="w-px self-stretch bg-gray-200" aria-hidden="true" />
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="block h-full w-full rounded-none border-0 bg-transparent py-3.5 pr-4 pl-12 text-base text-gray-900 placeholder:text-gray-400 focus:border-0 focus:ring-0 focus:ring-offset-0"
            />
          </div>
          <div className="w-px self-stretch bg-gray-200" aria-hidden="true" />
          <Button
            type="submit"
            size="lg"
            className="rounded-none rounded-r-xl px-6 text-sm font-medium shadow-none focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent"
          >
            {buttonLabel}
          </Button>
        </form>
        {hintText && (
          <p className="mt-3 text-xs leading-relaxed text-gray-500">{hintText}</p>
        )}
        {helperText && (
          <p className="mt-6 text-[11px] font-medium tracking-[0.2em] text-gray-400 uppercase">
            {helperText}
          </p>
        )}
        {exampleRow}
      </div>
    )
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
              "focus:border-primary-500 focus:ring-primary-200 block w-full rounded-md border-gray-300",
              isLarge ? "py-3 pr-3 pl-10 text-base" : "py-2 pr-3 pl-9 text-sm",
            )}
          />
        </div>
        <Button type="submit" size={isLarge ? "lg" : "md"}>
          {buttonLabel}
        </Button>
      </form>
      {hintText && (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">{hintText}</p>
      )}
      {helperText && (
        <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      )}
      {exampleRow}
    </div>
  )
}

export default SearchBox
