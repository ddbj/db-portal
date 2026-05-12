import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  dbclsConfig,
  ddbjConfig,
  getNewsSourceConfigs,
  getSourceConfig,
  langForPath,
} from "@/server/news-mirror/sources"

interface EnvSnapshot {
  NEWS_MIRROR_BRANCH: string | undefined
  NEWS_MIRROR_MAX_FILES_PER_LANG: string | undefined
  NEWS_MIRROR_DBCLS_ENABLED: string | undefined
  NEWS_MIRROR_DBCLS_BRANCH: string | undefined
  NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG: string | undefined
}

const snapshotEnv = (): EnvSnapshot => ({
  NEWS_MIRROR_BRANCH: process.env.NEWS_MIRROR_BRANCH,
  NEWS_MIRROR_MAX_FILES_PER_LANG: process.env.NEWS_MIRROR_MAX_FILES_PER_LANG,
  NEWS_MIRROR_DBCLS_ENABLED: process.env.NEWS_MIRROR_DBCLS_ENABLED,
  NEWS_MIRROR_DBCLS_BRANCH: process.env.NEWS_MIRROR_DBCLS_BRANCH,
  NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG: process.env.NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG,
})

const clearTargetEnv = (): void => {
  delete process.env.NEWS_MIRROR_BRANCH
  delete process.env.NEWS_MIRROR_MAX_FILES_PER_LANG
  delete process.env.NEWS_MIRROR_DBCLS_ENABLED
  delete process.env.NEWS_MIRROR_DBCLS_BRANCH
  delete process.env.NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG
}

const restoreEnv = (s: EnvSnapshot): void => {
  if (s.NEWS_MIRROR_BRANCH === undefined) delete process.env.NEWS_MIRROR_BRANCH
  else process.env.NEWS_MIRROR_BRANCH = s.NEWS_MIRROR_BRANCH
  if (s.NEWS_MIRROR_MAX_FILES_PER_LANG === undefined) delete process.env.NEWS_MIRROR_MAX_FILES_PER_LANG
  else process.env.NEWS_MIRROR_MAX_FILES_PER_LANG = s.NEWS_MIRROR_MAX_FILES_PER_LANG
  if (s.NEWS_MIRROR_DBCLS_ENABLED === undefined) delete process.env.NEWS_MIRROR_DBCLS_ENABLED
  else process.env.NEWS_MIRROR_DBCLS_ENABLED = s.NEWS_MIRROR_DBCLS_ENABLED
  if (s.NEWS_MIRROR_DBCLS_BRANCH === undefined) delete process.env.NEWS_MIRROR_DBCLS_BRANCH
  else process.env.NEWS_MIRROR_DBCLS_BRANCH = s.NEWS_MIRROR_DBCLS_BRANCH
  if (s.NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG === undefined) delete process.env.NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG
  else process.env.NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG = s.NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG
}

let env: EnvSnapshot

beforeEach(() => {
  env = snapshotEnv()
  clearTargetEnv()
})

afterEach(() => {
  restoreEnv(env)
})

describe("ddbjConfig", () => {
  it("defaults branch to main and uses _news path prefix", () => {
    const cfg = ddbjConfig()
    expect(cfg.source).toBe("ddbj")
    expect(cfg.branch).toBe("main")
    expect(cfg.pathPrefix.ja).toBe("_news/ja/")
    expect(cfg.pathPrefix.en).toBe("_news/en/")
    expect(cfg.needsTopNews).toBe(true)
    expect(cfg.enabled).toBe(true)
  })

  it("strips .md and -e suffix for en slug", () => {
    const cfg = ddbjConfig()
    expect(cfg.slugFromFilename("2026-04-08.md", "ja")).toBe("2026-04-08")
    expect(cfg.slugFromFilename("2026-04-08-e.md", "en")).toBe("2026-04-08")
    expect(cfg.slugFromFilename("2026-04-08.md", "en")).toBe("2026-04-08")
  })

  it("builds ddbj.nig.ac.jp sourceUrl", () => {
    const cfg = ddbjConfig()
    expect(cfg.buildSourceUrl("2026-04-08", "ja")).toBe(
      "https://www.ddbj.nig.ac.jp/news/ja/2026-04-08.html",
    )
  })

  it("respects NEWS_MIRROR_BRANCH override", () => {
    process.env.NEWS_MIRROR_BRANCH = "staging"
    expect(ddbjConfig().branch).toBe("staging")
  })
})

describe("dbclsConfig", () => {
  it("defaults branch to master and uses _posts path prefix", () => {
    const cfg = dbclsConfig()
    expect(cfg.source).toBe("dbcls")
    expect(cfg.branch).toBe("master")
    expect(cfg.pathPrefix.ja).toBe("_posts/ja/")
    expect(cfg.pathPrefix.en).toBe("_posts/en/")
    expect(cfg.needsTopNews).toBe(false)
    expect(cfg.enabled).toBe(true)
  })

  it("matches yyyy-mm-dd-postN.md and rejects template files", () => {
    const cfg = dbclsConfig()
    expect(cfg.filenamePattern.test("_posts/ja/2025-01-10-post1.md")).toBe(true)
    expect(cfg.filenamePattern.test("_posts/en/2024-12-31-post3.md")).toBe(true)
    expect(cfg.filenamePattern.test("_posts/ja/template_service.md")).toBe(false)
    expect(cfg.filenamePattern.test("_posts/ja/2025-01-10.md")).toBe(false)
    expect(cfg.filenamePattern.test("_news/ja/2026-04-08.md")).toBe(false)
  })

  it("returns null slug for non-conforming filenames", () => {
    const cfg = dbclsConfig()
    expect(cfg.slugFromFilename("2025-01-10-post1.md", "ja")).toBe("2025-01-10-post1")
    expect(cfg.slugFromFilename("template_service.md", "ja")).toBeNull()
    expect(cfg.slugFromFilename("2025-01-10.md", "ja")).toBeNull()
  })

  it("builds Jekyll permalink-style sourceUrl", () => {
    const cfg = dbclsConfig()
    expect(cfg.buildSourceUrl("2025-01-10-post1", "ja")).toBe(
      "https://dbcls.rois.ac.jp/ja/2025/01/10/post1.html",
    )
    expect(cfg.buildSourceUrl("2024-12-31-post3", "en")).toBe(
      "https://dbcls.rois.ac.jp/en/2024/12/31/post3.html",
    )
  })

  it("is disabled when NEWS_MIRROR_DBCLS_ENABLED=0", () => {
    process.env.NEWS_MIRROR_DBCLS_ENABLED = "0"
    expect(dbclsConfig().enabled).toBe(false)
  })

  it("respects NEWS_MIRROR_DBCLS_BRANCH override", () => {
    process.env.NEWS_MIRROR_DBCLS_BRANCH = "develop"
    expect(dbclsConfig().branch).toBe("develop")
  })
})

describe("getNewsSourceConfigs", () => {
  it("returns both sources by default", () => {
    const configs = getNewsSourceConfigs()
    expect(configs.map((c) => c.source).sort()).toEqual(["dbcls", "ddbj"])
  })

  it("excludes dbcls when NEWS_MIRROR_DBCLS_ENABLED=0", () => {
    process.env.NEWS_MIRROR_DBCLS_ENABLED = "0"
    const configs = getNewsSourceConfigs()
    expect(configs.map((c) => c.source)).toEqual(["ddbj"])
  })
})

describe("getSourceConfig / langForPath", () => {
  it("looks up by source value", () => {
    expect(getSourceConfig("ddbj")?.source).toBe("ddbj")
    expect(getSourceConfig("dbcls")?.source).toBe("dbcls")
  })

  it("derives lang from path prefix", () => {
    expect(langForPath(ddbjConfig(), "_news/ja/foo.md")).toBe("ja")
    expect(langForPath(ddbjConfig(), "_news/en/foo.md")).toBe("en")
    expect(langForPath(ddbjConfig(), "_posts/ja/foo.md")).toBeNull()
    expect(langForPath(dbclsConfig(), "_posts/ja/foo.md")).toBe("ja")
    expect(langForPath(dbclsConfig(), "_posts/en/foo.md")).toBe("en")
    expect(langForPath(dbclsConfig(), "_news/ja/foo.md")).toBeNull()
  })
})
