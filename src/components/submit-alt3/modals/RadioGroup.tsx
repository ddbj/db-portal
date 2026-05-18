interface Option<T extends string> {
  value: T
  label: string
  description?: string
}

interface Props<T extends string> {
  legend: string
  name: string
  value: T
  options: readonly Option<T>[]
  onChange: (next: T) => void
}

// modal 内の radio group 共通レイアウト
const RadioGroup = <T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: Props<T>) => (
  <fieldset>
    <legend className="mb-2 text-sm font-semibold text-gray-700">
      {legend}
    </legend>
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="text-primary-600 focus:ring-primary-200 mt-1"
          />
          <span>
            {opt.label}
            {opt.description && (
              <span className="block text-xs text-gray-500">
                {opt.description}
              </span>
            )}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
)

export default RadioGroup
