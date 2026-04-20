import { screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Search from "@/routes/search"

import { renderWithProviders } from "../../helpers/providers"

describe("/search route — cross mode", () => {

  it("renders 8 DB hit count cards for ?q=human", async () => {
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(screen.getByText("BioProject")).toBeInTheDocument()
      expect(screen.getByText("BioSample")).toBeInTheDocument()
      expect(screen.getByText("SRA")).toBeInTheDocument()
    })
  })

  it("shows cross-mode summary chip with all-db prefix", async () => {
    renderWithProviders(<Search />, { route: "/search?q=human" })
    await waitFor(() => {
      expect(screen.getByText(/全データベースで絞り込み中/)).toBeInTheDocument()
    })
  })

  it("shows partial failure banner for ?q=__partial__", async () => {
    renderWithProviders(<Search />, { route: "/search?q=__partial__" })
    await waitFor(() => {
      expect(screen.getByText(/一部の検索サービスが不安定/)).toBeInTheDocument()
    })
  })

  it("shows all-error banner for ?q=__error__", async () => {
    renderWithProviders(<Search />, { route: "/search?q=__error__" })
    await waitFor(() => {
      expect(screen.getByText(/検索サービスに接続できません/)).toBeInTheDocument()
    })
  })

  it("renders both_q_and_adv warning when both are present", async () => {
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
    renderWithProviders(<Search />, {
      route: "/search?q=human&db=bioproject",
    })
    await waitFor(() => {
      // toolbar shows total count
      expect(screen.getByText(/全 45,678 件中/)).toBeInTheDocument()
    })
    // pagination
    expect(screen.getByRole("button", { name: "前へ" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "次へ" })).toBeInTheDocument()
  })

  it("uses db-name prefix in summary chip", async () => {
    renderWithProviders(<Search />, {
      route: "/search?q=human&db=sra",
    })
    await waitFor(() => {
      expect(screen.getByText(/SRA で絞り込み中/)).toBeInTheDocument()
    })
  })

  it("shows 10k-over callout and disables next for Solr DB at page 500", async () => {
    renderWithProviders(<Search />, {
      route: "/search?q=human&db=trad&page=500",
    })
    await waitFor(() => {
      expect(screen.getByText(/10,000 件まで/)).toBeInTheDocument()
    })
    const nextBtn = screen.getByRole("button", { name: "次へ" })
    expect(nextBtn).toBeDisabled()
  })

  it("does not show 10k callout for ES-backed DB (bioproject)", async () => {
    renderWithProviders(<Search />, {
      route: "/search?q=human&db=bioproject",
    })
    await waitFor(() => {
      expect(screen.getByText(/全 45,678 件中/)).toBeInTheDocument()
    })
    expect(screen.queryByText(/10,000 件まで/)).not.toBeInTheDocument()
  })
})

describe("/search route — redirect", () => {

  it("renders nothing visible when both q and adv are empty (redirects to /)", () => {
    // Navigate components just swap the route; within MemoryRouter without
    // definition of "/" route there's nothing rendered. The key check is that
    // the cross-mode UI does not appear.
    renderWithProviders(<Search />, { route: "/search" })
    expect(screen.queryByText(/全データベースで絞り込み中/)).not.toBeInTheDocument()
    expect(screen.queryByText(/全.+件中/)).not.toBeInTheDocument()
  })
})
