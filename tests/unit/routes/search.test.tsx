import { screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Search, { loader } from "@/routes/search"

import { renderWithProviders } from "../../helpers/providers"

const mockLoaderData = vi.fn()
const mockRevalidate = vi.fn()

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>

  return {
    ...actual,
    useLoaderData: () => mockLoaderData(),
    useRevalidator: () => ({ revalidate: mockRevalidate, state: "idle" }),
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

beforeEach(() => {
  mockLoaderData.mockReset()
  mockRevalidate.mockReset()
})

describe("/search route — cross mode", () => {

  it("renders 8 DB hit count cards for ?q=human", async () => {
    await setupRoute("/search?q=human")
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(screen.getByText("BioProject")).toBeInTheDocument()
      expect(screen.getByText("BioSample")).toBeInTheDocument()
      expect(screen.getByText("SRA")).toBeInTheDocument()
    })
  })

  it("shows cross-mode summary chip with all-db prefix", async () => {
    await setupRoute("/search?q=human")
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(screen.getByText(/全データベースで絞り込み中/)).toBeInTheDocument()
    })
  })

  it("shows partial failure banner for ?q=__partial__", async () => {
    await setupRoute("/search?q=__partial__")
    renderWithProviders(<Search />, { route: "/search?q=__partial__" })
    await waitFor(() => {
      expect(screen.getByText(/一部の検索サービスが不安定/)).toBeInTheDocument()
    })
  })

  it("shows all-error banner for ?q=__error__", async () => {
    await setupRoute("/search?q=__error__")
    renderWithProviders(<Search />, { route: "/search?q=__error__" })
    await waitFor(() => {
      expect(screen.getByText(/検索サービスに接続できません/)).toBeInTheDocument()
    })
  })

  it("renders both_q_and_adv warning when both are present", async () => {
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
    await setupRoute("/search?q=human&db=bioproject")
    renderWithProviders(<Search />, { route: "/search?q=human&db=bioproject" })
    await waitFor(() => {
      expect(screen.getByText(/全 45,678 件中/)).toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "前へ" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument()
  })

  it("uses db-name prefix in summary chip", async () => {
    await setupRoute("/search?q=human&db=sra")
    renderWithProviders(<Search />, { route: "/search?q=human&db=sra" })
    await waitFor(() => {
      expect(screen.getByText(/SRA で絞り込み中/)).toBeInTheDocument()
    })
  })

  it("shows 10k-over callout and disables next for Solr DB at page 500", async () => {
    await setupRoute("/search?q=human&db=trad&page=500")
    renderWithProviders(<Search />, { route: "/search?q=human&db=trad&page=500" })
    await waitFor(() => {
      expect(screen.getByText(/10,000 件まで/)).toBeInTheDocument()
    })
    const nextBtn = screen.getByRole("button", { name: "次へ" })
    expect(nextBtn).toBeDisabled()
  })

  it("does not show 10k callout for ES-backed DB (bioproject)", async () => {
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
