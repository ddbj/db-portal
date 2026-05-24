export type NewsCacheEntry = {
  schemaVersion: 1
  source: "ddbj"
  lastCommitSha: Record<"ja" | "en", string | null>
  lastFetchedAt: string
  items: unknown[]
}

export const readCache = async (_cacheDir: string): Promise<NewsCacheEntry | undefined> =>
  undefined

export const writeCache = async (_cacheDir: string, _entry: NewsCacheEntry): Promise<void> => {
  return
}
