import type { Request, Response } from "express"

import { NewsCategory } from "../../app/schemas/api-bff/news"
import { getActiveNewsCache } from "../news/mirror"

const isNewsCategory = (value: string): value is (typeof NewsCategory.options)[number] =>
  (NewsCategory.options as readonly string[]).includes(value)

const splitList = (value: string | undefined): string[] => {
  if (!value) return []

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

const parseLang = (value: string | null): "ja" | "en" | undefined =>
  value === "ja" || value === "en" ? value : undefined

const parseCategories = (raw: string | null): readonly (typeof NewsCategory.options)[number][] =>
  splitList(raw ?? undefined).filter(isNewsCategory)

const parseYears = (raw: string | null): readonly number[] =>
  splitList(raw ?? undefined)
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 1900)

const parseServices = (raw: string | null): readonly string[] =>
  splitList(raw ?? undefined).map((entry) => entry.toLowerCase())

export const handleNews = (req: Request, res: Response): void => {
  res.setHeader("Cache-Control", "public, max-age=60")
  const cache = getActiveNewsCache()
  if (!cache) {
    res.status(200).json([])

    return
  }
  const url = new URL(req.originalUrl, "http://internal.invalid")
  const lang = parseLang(url.searchParams.get("lang"))
  const items = cache.list({
    ...(lang ? { lang } : {}),
    category: parseCategories(url.searchParams.get("category")),
    year: parseYears(url.searchParams.get("year")),
    service: parseServices(url.searchParams.get("service")),
  })
  res.status(200).json(items)
}
