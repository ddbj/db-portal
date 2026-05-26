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
          className="font-mono text-fs-meta text-ink bg-surface-subtle border border-border-soft rounded-tag"
          style={{ padding: "1px 7px" }}
        >
          {code}
        </code>
      ))}
    </span>
  )
}
