import type { Request, Response } from "express"

import { ServiceCategory, ServiceSource } from "../../app/schemas/api-bff/service"
import { getActiveServicesCache } from "../services/mirror"

const isServiceCategory = (value: string): value is (typeof ServiceCategory.options)[number] =>
  (ServiceCategory.options as readonly string[]).includes(value)

const isServiceSource = (value: string): value is (typeof ServiceSource.options)[number] =>
  (ServiceSource.options as readonly string[]).includes(value)

const splitList = (value: string | null): string[] => {
  if (!value) return []

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

const parseFeatured = (value: string | null): boolean =>
  value === "true" || value === "1"

export const handleServices = (req: Request, res: Response): void => {
  res.setHeader("Cache-Control", "public, max-age=60")
  const cache = getActiveServicesCache()
  if (!cache) {
    res.status(200).json([])

    return
  }
  const url = new URL(req.originalUrl, "http://internal.invalid")
  const items = cache.list({
    source: splitList(url.searchParams.get("source")).filter(isServiceSource),
    category: splitList(url.searchParams.get("category")).filter(isServiceCategory),
    featured: parseFeatured(url.searchParams.get("featured")),
  })
  res.status(200).json(items)
}
