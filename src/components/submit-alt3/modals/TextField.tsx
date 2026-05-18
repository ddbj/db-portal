import cn from "@/components/ui/cn"

interface Props {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

// modal 内の単行テキスト入力 (ファイル名 / accession / DOI 等)
const TextField = ({ id, label, value, onChange, placeholder }: Props) => (
  <div>
    <label
      htmlFor={id}
      className="mb-1 block text-sm font-semibold text-gray-700"
    >
      {label}
    </label>
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "block w-full rounded-md border-gray-300 px-3 py-2 text-sm",
        "focus:border-primary-500 focus:ring-primary-200",
      )}
    />
  </div>
)

export default TextField
