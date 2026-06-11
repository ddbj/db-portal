import { useEffect, useRef, useState } from "react"

// Two-way debounced bridge between a snappy local input and a parent commit
// that drives expensive downstream work (re-fetching results, URL push). The
// box updates immediately on every keystroke; the parent only sees the value
// after the user pauses for `ms`. An external parent change (URL restore,
// clear) re-seeds the local copy.
export const useDebouncedSync = <T>(
  value: T,
  onCommit: (next: T) => void,
  ms: number,
): readonly [T, (next: T) => void] => {
  const [local, setLocal] = useState(value)

  // Pin onCommit so a fresh function identity on every render does not reset
  // the debounce timer mid-typing.
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onCommitRef.current = onCommit
  }, [onCommit])

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    if (local === value) return
    const id = setTimeout(() => onCommitRef.current(local), ms)

    return () => clearTimeout(id)
  }, [local, value, ms])

  return [local, setLocal]
}
