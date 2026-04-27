import { screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api"
import Search, { loader } from "@/routes/search"
import { DB_ORDER, type DbId } from "@/types/db"

import { renderWithProviders } from "../../helpers/providers"

const mockLoaderData = vi.fn()
const mockRevalidate = vi.fn()
const mockCrossSearch = vi.fn()
const mockDbSearch = vi.fn()

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>

  return {
    ...actual,
    useLoaderData: () => mockLoaderData(),
    useRevalidator: () => ({ revalidate: mockRevalidate, state: "idle" }),
  }
})

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>

  return {
    ...actual,
    crossSearch: (...args: unknown[]) => mockCrossSearch(...args),
    dbSearch: (...args: unknown[]) => mockDbSearch(...args),
  }
})

const runLoader = async (route: string) => {
  const request = new Request(`http://localhost${route}`)
  const loaderArgs = { request, params: {}, context: {} } as Parameters<typeof loader>[0]

  return loader(loaderArgs)
}

const setupRoute = async (route: string) => {
  const data = await runLoader(route)
  mockLoaderData.mockReturnValue(data)
}

const buildSuccessCross = () => ({
  databases: DB_ORDER.map((db, idx) => ({
    db,
    count: (idx + 1) * 1234,
    error: null as null,
    hits: [],
  })),
})

const buildPartialFailureCross = () => {
  const errorDbs: ReadonlySet<DbId> = new Set<DbId>([
    "trad",
    "biosample",
    "gea",
    "taxonomy",
  ])

  return {
    databases: DB_ORDER.map((db) => {
      if (errorDbs.has(db)) {
        return { db, count: null, error: "upstream_5xx" as const, hits: [] }
      }

      return { db, count: 100, error: null as null, hits: [] }
    }),
  }
}

const buildHits = (total: number, hardLimitReached = false) => ({
  total,
  hits: [
    {
      identifier: "PRJDB1",
      type: "bioproject" as const,
      title: "Sample BioProject",
      description: "desc",
      organism: { identifier: "9606", name: "Homo sapiens" },
      datePublished: "2024-01-15",
      dateModified: null,
      dateCreated: null,
      url: "https://example.com/PRJDB1",
      sameAs: [],
      dbXrefs: null,
      status: "public" as const,
      accessibility: "public-access" as const,
      objectType: "BioProject" as const,
      organization: [{ name: "DDBJ" }],
      publication: [],
      grant: [],
      externalLink: [],
    },
  ],
  hardLimitReached,
  page: 1,
  perPage: 20,
  nextCursor: null,
  hasNext: false,
})

beforeEach(() => {
  mockLoaderData.mockReset()
  mockRevalidate.mockReset()
  mockCrossSearch.mockReset()
  mockDbSearch.mockReset()
})

describe("/search route — cross mode", () => {

  it("renders 8 DB hit count cards for ?q=human", async () => {
    mockCrossSearch.mockResolvedValue(buildSuccessCross())
    await setupRoute("/search?q=human")
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(screen.getByText("BioProject")).toBeInTheDocument()
      expect(screen.getByText("BioSample")).toBeInTheDocument()
      expect(screen.getByText("SRA")).toBeInTheDocument()
    })
  })

  it("shows cross-mode summary chip with all-db prefix", async () => {
    mockCrossSearch.mockResolvedValue(buildSuccessCross())
    await setupRoute("/search?q=human")
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(screen.getByText(/全データベースで絞り込み中/)).toBeInTheDocument()
    })
  })

  it("shows partial failure banner when 4 of 8 DBs return error", async () => {
    mockCrossSearch.mockResolvedValue(buildPartialFailureCross())
    await setupRoute("/search?q=human")
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(screen.getByText(/一部の検索サービスが不安定/)).toBeInTheDocument()
    })
  })

  it("shows default error callout when crossSearch rejects without a known slug", async () => {
    mockCrossSearch.mockRejectedValue(new ApiError(502, null))
    await setupRoute("/search?q=human")
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(screen.getByText(/検索でエラーが発生しました/)).toBeInTheDocument()
    })
  })

  it("shows slug-specific message when ApiError carries a known type URI", async () => {
    mockCrossSearch.mockRejectedValue(new ApiError(400, {
      type: "https://ddbj.nig.ac.jp/problems/invalid-query-combination",
      title: "Invalid",
      status: 400,
      detail: "q and adv specified together",
    }))
    await setupRoute("/search?q=human")
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(
        screen.getByText(/シンプル検索と詳細検索を同時に指定/),
      ).toBeInTheDocument()
    })
  })

  it("renders both_q_and_adv warning when both are present", async () => {
    mockCrossSearch.mockResolvedValue(buildSuccessCross())
    await setupRoute("/search?q=human&adv=title%3Acancer")
    renderWithProviders(<Search />, {
      route: "/search?q=human&adv=title%3Acancer",
    })
    await waitFor(() => {
      expect(
        screen.getByText(/シンプル検索と詳細検索の両方が指定されています/),
      ).toBeInTheDocument()
    })
  })
})

describe("/search route — DB-specified mode", () => {

  it("renders ResultCardList and Pagination for ?q=human&db=bioproject", async () => {
    mockDbSearch.mockResolvedValue(buildHits(45_678))
    await setupRoute("/search?q=human&db=bioproject")
    renderWithProviders(<Search />, { route: "/search?q=human&db=bioproject" })
    await waitFor(() => {
      expect(screen.getByText(/全 45,678 件中/)).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "前へ" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument()
  })

  it("uses db-name prefix in summary chip", async () => {
    mockDbSearch.mockResolvedValue(buildHits(100))
    await setupRoute("/search?q=human&db=sra")
    renderWithProviders(<Search />, { route: "/search?q=human&db=sra" })
    await waitFor(() => {
      expect(screen.getByText(/SRA で絞り込み中/)).toBeInTheDocument()
    })
  })

  it("shows 10k-over callout and disables next when hardLimitReached=true", async () => {
    mockDbSearch.mockResolvedValue(buildHits(50_000, true))
    await setupRoute("/search?q=human&db=trad&page=500")
    renderWithProviders(<Search />, { route: "/search?q=human&db=trad&page=500" })
    await waitFor(() => {
      expect(screen.getByText(/10,000 件まで/)).toBeInTheDocument()
    })
    const nextBtn = screen.getByRole("button", { name: "次へ" })
    expect(nextBtn).toBeDisabled()
  })

  it("does not show 10k callout when hardLimitReached=false", async () => {
    mockDbSearch.mockResolvedValue(buildHits(45_678, false))
    await setupRoute("/search?q=human&db=bioproject")
    renderWithProviders(<Search />, { route: "/search?q=human&db=bioproject" })
    await waitFor(() => {
      expect(screen.getByText(/全 45,678 件中/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/10,000 件まで/)).not.toBeInTheDocument()
  })
})

describe("/search route — empty-query fallback", () => {

  it("loader throws a redirect to /search?q=human when neither q nor adv are given", async () => {
    const thrown = await runLoader("/search").then(
      () => null,
      (e: unknown) => e,
    )
    expect(thrown).toBeInstanceOf(Response)
    const response = thrown as Response
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/search?q=human")
  })
})
