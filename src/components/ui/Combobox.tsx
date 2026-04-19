import { ChevronDown } from "lucide-react"
import {
  type ChangeEvent,
  type FocusEvent,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react"

import cn from "./cn"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: readonly ComboboxOption[]
  value: string
  onChange: (next: string) => void
  placeholder?: string
  invalid?: boolean
  inputSize?: keyof typeof sizeStyles
  className?: string
}

const sizeStyles = {
  sm: "px-2.5 py-1.5 pr-8 text-xs",
  md: "px-3 py-2 pr-8 text-sm",
  lg: "px-4 py-2.5 pr-10 text-base",
} as const

const Combobox = ({
  options,
  value,
  onChange,
  placeholder,
  invalid,
  inputSize = "md",
  className,
}: ComboboxProps) => {
  const [open, setOpen] = useState(false)
  const initial = useMemo(
    () => options.find((o) => o.value === value)?.label ?? value,
    [options, value],
  )
  const [inputValue, setInputValue] = useState(initial)
  const listId = useId()

  useEffect(() => {
    setInputValue(initial)
  }, [initial])

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase()
    if (!q) return options

    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [inputValue, options])

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setOpen(true)
  }

  const handleSelect = (opt: ComboboxOption) => {
    setInputValue(opt.label)
    onChange(opt.value)
    setOpen(false)
  }

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setOpen(false)
  }

  return (
    <div className={cn("relative", className)} onBlur={handleBlur}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        className={cn(
          "block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-200",
          sizeStyles[inputSize],
          invalid && "border-red-300 focus:border-red-500 focus:ring-red-200",
        )}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
      {open && filtered.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg"
        >
          {filtered.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(opt)}
              className="hover:bg-primary-50 cursor-pointer px-3 py-1.5"
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Combobox
