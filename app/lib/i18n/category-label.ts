import type { NewsCategory } from "~/lib/api"

export type CategoryLabelKey = `news.category.${NewsCategory}`

export const categoryLabelKey = (category: NewsCategory): CategoryLabelKey =>
  `news.category.${category}` as CategoryLabelKey
