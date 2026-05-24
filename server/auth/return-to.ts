const isSameOriginPath = (raw: string): boolean => {
  if (typeof raw !== "string") return false
  if (!raw.startsWith("/")) return false
  if (raw.startsWith("//")) return false
  if (raw.startsWith("/\\")) return false

  return true
}

export const normalizeReturnTo = (raw: string | null | undefined): string => {
  if (raw === null || raw === undefined) return "/"
  if (!isSameOriginPath(raw)) return "/"

  return raw
}
