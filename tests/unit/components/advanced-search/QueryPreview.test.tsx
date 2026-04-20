import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import QueryPreview from "@/components/advanced-search/QueryPreview"

import { renderWithProviders } from "../../../helpers/providers"

describe("QueryPreview", () => {
  it("dsl が与えられればコード表示", () => {
    renderWithProviders(
      <QueryPreview
        dsl={"title:cancer AND organism:\"Homo sapiens\""}
        initialAdv={null}
        errors={[]}
      />,
    )
    expect(screen.getByText(/title:cancer/)).toBeInTheDocument()
  })

  it("dsl 空 / initialAdv null → empty メッセージ表示", () => {
    renderWithProviders(<QueryPreview dsl="" initialAdv={null} errors={[]} />)
    expect(
      screen.getByText(/条件を追加するとクエリが表示されます/),
    ).toBeInTheDocument()
  })

  it("dsl 空 / initialAdv あり → initialAdv 表示 + urlOnly ヒント", () => {
    renderWithProviders(
      <QueryPreview dsl="" initialAdv="title:cancer" errors={[]} />,
    )
    expect(screen.getByText("title:cancer")).toBeInTheDocument()
    expect(screen.getByText(/URL から受信した DSL/)).toBeInTheDocument()
  })

  it("errors があれば Callout で列挙", () => {
    renderWithProviders(
      <QueryPreview
        dsl=""
        initialAdv={null}
        errors={[
          { code: "MISSING_VALUE", path: [0] },
          { code: "NEST_DEPTH_EXCEEDED", path: [] },
        ]}
      />,
    )
    expect(screen.getByText(/値を入力してください/)).toBeInTheDocument()
    expect(
      screen.getByText(/ネスト深さが上限 5 を超えています/),
    ).toBeInTheDocument()
  })

  it("コピーボタンは dsl が空の時は disabled", () => {
    renderWithProviders(<QueryPreview dsl="" initialAdv={null} errors={[]} />)
    const copyBtn = screen.getByRole("button", { name: /コピー/ })
    expect(copyBtn).toBeDisabled()
  })
})
