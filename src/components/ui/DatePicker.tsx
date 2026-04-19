import "react-day-picker/style.css"

import { format, isValid, parse } from "date-fns"
import { Calendar } from "lucide-react"
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { DayPicker } from "react-day-picker"

import cn from "./cn"

const sizeStyles = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
} as const

interface DatePickerProps {
  value?: Date | undefined
  onChange: (next: Date | undefined) => void
  invalid?: boolean
  inputSize?: keyof typeof sizeStyles
  className?: string
  placeholder?: string
}

const FORMAT = "yyyy-MM-dd"

const DatePicker = ({
  value,
  onChange,
  invalid,
  inputSize = "md",
  className,
  placeholder = "YYYY-MM-DD",
}: DatePickerProps) => {
  const [open, setOpen] = useState(false)
  const [textValue, setTextValue] = useState(value ? format(value, FORMAT) : "")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTextValue(value ? format(value, FORMAT) : "")
  }, [value])

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setTextValue(next)
    if (!next) {
      onChange(undefined)

      return
    }
    const parsed = parse(next, FORMAT, new Date())
    if (isValid(parsed)) onChange(parsed)
  }

  const handleSelect = (selected: Date | undefined) => {
    onChange(selected)
    setOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className={cn(
            "block w-full rounded-md border-gray-300 pr-9 focus:border-primary-500 focus:ring-primary-200",
            sizeStyles[inputSize],
            invalid && "border-red-300 focus:border-red-500 focus:ring-red-200",
          )}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="hover:text-primary-700 absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-500"
          aria-label="カレンダーを開く"
        >
          <Calendar className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="absolute z-20 mt-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={handleSelect}
            classNames={{
              selected: "bg-primary-600 text-white rounded",
              today: "font-semibold text-primary-700",
            }}
          />
        </div>
      )}
    </div>
  )
}

export default DatePicker
