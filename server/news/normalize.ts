import { NewsCategory } from "../../app/schemas/api-bff/news"

export { NewsCategory } from "../../app/schemas/api-bff/news"

const DEFAULT_CATEGORY: NewsCategory = "news"

const TAG_TO_CATEGORY: [RegExp, NewsCategory][] = NewsCategory.options
  .filter((category) => category !== DEFAULT_CATEGORY)
  .map((category) => [new RegExp(`^${category}$`, "i"), category])

export const tagsToCategory = (tags: readonly string[]): NewsCategory => {
  for (const tag of tags) {
    for (const [pattern, category] of TAG_TO_CATEGORY) {
      if (pattern.test(tag)) return category
    }
  }

  return DEFAULT_CATEGORY
}
