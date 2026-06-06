import { describe, expect, test } from "vitest"

import {
  absolutizeDdbjUrl,
  itemId,
  nameSlug,
  normalizeDbclsServices,
  normalizeDdbjServices,
} from "../../../../server/services/normalize"
import { dbclsJson, ddbjYaml, silentLogger } from "./_fixtures"

const ddbj = () => normalizeDdbjServices(ddbjYaml, silentLogger)
const dbcls = () => normalizeDbclsServices(dbclsJson, silentLogger)
const byId = (id: string, items = ddbj()) => items.find((s) => s.id === id)

describe("normalizeDdbjServices", () => {
  test("excludes non-DDBJ provider entries", () => {
    const names = ddbj().map((s) => s.name.en)
    expect(names).not.toContain("TogoVar")
    expect(ddbj()).toHaveLength(5)
  })

  test("maps database+submission tags to a single repository category", () => {
    expect(byId("ddbj-bioproject")?.categories).toEqual(["repository"])
  })

  test("maps multiple distinct tags and keeps order", () => {
    expect(byId("ddbj-dfast")?.categories).toEqual(["analysis", "repository", "annotation"])
  })

  test("falls back to other when no known tag", () => {
    expect(byId("ddbj-notagservice")?.categories).toEqual(["other"])
  })

  test("absolutizes relative service_link against the DDBJ base", () => {
    expect(byId("ddbj-bioproject")?.url).toEqual({
      ja: "https://www.ddbj.nig.ac.jp/bioproject/index.html",
      en: "https://www.ddbj.nig.ac.jp/bioproject/index-e.html",
    })
  })

  test("keeps absolute service_link as-is", () => {
    expect(byId("ddbj-txsearch")?.url?.en).toBe("https://ddbj.nig.ac.jp/tx_search/?lang=en")
  })

  test("strips HTML from descriptions", () => {
    const desc = byId("ddbj-dfast")?.description.en ?? ""
    expect(desc).not.toContain("<a")
    expect(desc).toContain("an annotation file")
  })

  test("sets featuredTop only for whitelisted names", () => {
    expect(byId("ddbj-bioproject")?.featuredTop).toBe(true)
    expect(byId("ddbj-dfast")?.featuredTop).toBe(false)
  })

  test("uses the short name for both languages and id", () => {
    expect(byId("ddbj-bioproject")?.name).toEqual({ ja: "BioProject", en: "BioProject" })
  })
})

describe("normalizeDbclsServices", () => {
  test("skips the header row, non-published and nameless entries", () => {
    const items = dbcls()
    const ids = items.map((s) => s.id).sort()
    expect(ids).toEqual(["dbcls-gggenome", "dbcls-refex", "dbcls-togoid"])
    expect(items).toHaveLength(3)
  })

  test("maps Category flags to categories with raw labels", () => {
    const togoid = byId("dbcls-togoid", dbcls())
    expect(togoid?.categories).toEqual(["integration", "search"])
    expect(togoid?.rawCategories).toEqual(["Database integration", "SPARQL Search"])
  })

  test("coerces string boolean for 掲載", () => {
    expect(byId("dbcls-gggenome", dbcls())).toBeDefined()
  })

  test("domain-only categories fall back to other", () => {
    expect(byId("dbcls-gggenome", dbcls())?.categories).toEqual(["other"])
    expect(byId("dbcls-refex", dbcls())?.categories).toEqual(["other"])
  })

  test("uses the single URL for both languages", () => {
    expect(byId("dbcls-togoid", dbcls())?.url).toEqual({
      ja: "https://togoid.dbcls.jp/",
      en: "https://togoid.dbcls.jp/",
    })
  })

  test("drops a URL whose scheme is not http(s)", () => {
    const json = JSON.stringify([
      { services_name_en: "header" },
      {
        services_name_en: "Evil",
        services_name_ja: "Evil",
        URL: "javascript:alert(1)",
        掲載: true,
      },
    ])
    const items = normalizeDbclsServices(json, silentLogger)
    expect(items.find((s) => s.id === "dbcls-evil")?.url).toBeUndefined()
  })

  test("sets featuredTop only for Togo-prefixed names", () => {
    expect(byId("dbcls-togoid", dbcls())?.featuredTop).toBe(true)
    expect(byId("dbcls-gggenome", dbcls())?.featuredTop).toBe(false)
  })

  test("applies display-name overrides", () => {
    const json = JSON.stringify([
      { services_name_en: "header" },
      {
        services_name_en: "TogoDX/human",
        services_name_ja: "TogoDX/human",
        URL: "https://togodx.dbcls.jp/human",
        掲載: true,
      },
      {
        services_name_en: "TogoTV",
        services_name_ja: "統合TV",
        URL: "https://togotv.dbcls.jp/",
        掲載: true,
      },
    ])
    const items = normalizeDbclsServices(json, silentLogger)
    const togodx = items.find((s) => s.id === "dbcls-togodx")
    expect(togodx?.name).toEqual({ ja: "TogoDX", en: "TogoDX" })
    expect(togodx?.featuredTop).toBe(true)
    expect(items.find((s) => s.id === "dbcls-togotv")?.name).toEqual({
      ja: "TogoTV",
      en: "TogoTV",
    })
  })
})

describe("helpers", () => {
  test("nameSlug normalizes to lowercase kebab", () => {
    expect(nameSlug("TogoDX/human")).toBe("togodx-human")
    expect(nameSlug("DDBJ Search")).toBe("ddbj-search")
    expect(nameSlug("TogoVar-repository")).toBe("togovar-repository")
    expect(nameSlug("GGGenome")).toBe("gggenome")
  })

  test("itemId prefixes the source", () => {
    expect(itemId("ddbj", "BioProject")).toBe("ddbj-bioproject")
    expect(itemId("dbcls", "TogoID")).toBe("dbcls-togoid")
  })

  test("absolutizeDdbjUrl handles relative, absolute and invalid", () => {
    expect(absolutizeDdbjUrl("/dra/index.html")).toBe("https://www.ddbj.nig.ac.jp/dra/index.html")
    expect(absolutizeDdbjUrl("https://togovar.org/")).toBe("https://togovar.org/")
    expect(absolutizeDdbjUrl("http://example.org/")).toBe("http://example.org/")
    expect(absolutizeDdbjUrl("   ")).toBeUndefined()
    expect(absolutizeDdbjUrl("not a url")).toBeUndefined()
  })

  test("absolutizeDdbjUrl rejects non-http(s) schemes", () => {
    expect(absolutizeDdbjUrl("javascript:alert(1)")).toBeUndefined()
    expect(absolutizeDdbjUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined()
    expect(absolutizeDdbjUrl("vbscript:msgbox(1)")).toBeUndefined()
    expect(absolutizeDdbjUrl("file:///etc/passwd")).toBeUndefined()
  })
})
