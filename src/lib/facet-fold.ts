export interface RawBucket {
  readonly key: string
  readonly doc_count: number
}

export interface FoldedFacet {
  readonly displayKey: string
  readonly aliases: readonly string[]
  readonly doc_count: number
}

export const foldFacetBuckets = (
  buckets: readonly RawBucket[],
): readonly FoldedFacet[] => {
  const groups = new Map<string, RawBucket[]>()
  for (const bucket of buckets) {
    const groupKey = bucket.key.toLowerCase()
    const existing = groups.get(groupKey) ?? []
    existing.push(bucket)
    groups.set(groupKey, existing)
  }

  return Array.from(groups.values()).map((bucketGroup) => {
    const sorted = [...bucketGroup].sort((a, b) => b.doc_count - a.doc_count)
    const top = sorted[0]
    if (top === undefined) {
      return { displayKey: "", aliases: [], doc_count: 0 }
    }

    return {
      displayKey: top.key,
      aliases: bucketGroup.map((b) => b.key),
      doc_count: bucketGroup.reduce((sum, b) => sum + b.doc_count, 0),
    }
  })
}
