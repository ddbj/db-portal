export type NewsCategory =
  | "announcement"
  | "release"
  | "maintenance"
  | "event"
  | "news"

const TAG_TO_CATEGORY: [RegExp, NewsCategory][] = [
  [/^announcement$/i, "announcement"],
  [/^release$/i, "release"],
  [/^maintenance$/i, "maintenance"],
  [/^event$/i, "event"],
]

export const tagsToCategory = (tags: readonly string[]): NewsCategory => {
  for (const tag of tags) {
    for (const [pattern, category] of TAG_TO_CATEGORY) {
      if (pattern.test(tag)) return category
    }
  }

  return "news"
}
