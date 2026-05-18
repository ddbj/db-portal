interface Props {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  description?: string
}

// modal 内の単独 checkbox 共通レイアウト
const CheckboxField = ({ label, checked, onChange, description }: Props) => (
  <label className="flex items-start gap-2 text-sm">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="text-primary-600 focus:ring-primary-200 mt-1"
    />
    <span>
      {label}
      {description && (
        <span className="block text-xs text-gray-500">{description}</span>
      )}
    </span>
  </label>
)

export default CheckboxField
