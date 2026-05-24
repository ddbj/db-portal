type AccessionCodeProps = {
  codes: readonly string[]
}

export const AccessionCode = ({ codes }: AccessionCodeProps) => {
  if (codes.length === 0) return null
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {codes.map((code) => (
        <code
          key={code}
          className="font-mono text-fs-micro font-bold text-brand-deep bg-brand-soft px-1.5 py-0.5 rounded-tag"
        >
          {code}
        </code>
      ))}
    </span>
  )
}
