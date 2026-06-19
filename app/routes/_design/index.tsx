import { Link } from "react-router"

import { Callout, PageTitle } from "~/ui"

const DesignIndex = () => (
  <div>
    <PageTitle
      eyebrow="Design preview"
      title="Design system"
      subtitle="開発時のみ生成される視覚チェック画面。tokens と primitives の最終形態を 1 ページで確認するために置いている。"
    />
    <Callout tone="info">
      この画面は production build では生成されない。`DB_PORTAL_ENABLE_DESIGN_PREVIEW=true` を設定した staging でのみ別途有効化できる。
    </Callout>
    <ul className="mt-section-md list-none p-0 grid grid-cols-2 gap-4 text-fs-body">
      <li className="border border-border-soft rounded-card p-4 bg-surface">
        <h2 className="text-fs-h2 font-bold text-ink m-0 mb-2">Tokens</h2>
        <p className="text-ink-mid m-0 mb-3 text-fs-body-sm leading-relaxed">
          色 / typography / spacing / radius / shadow を `@theme` トークンと並べて視覚確認する。
        </p>
        <Link to="/_design/tokens" className="text-brand font-semibold no-underline hover:underline">
          /_design/tokens →
        </Link>
      </li>
      <li className="border border-border-soft rounded-card p-4 bg-surface">
        <h2 className="text-fs-h2 font-bold text-ink m-0 mb-2">Primitives</h2>
        <p className="text-ink-mid m-0 mb-3 text-fs-body-sm leading-relaxed">
          22 primitive を variant × size × state すべてのケースで並べる。利用側はこの画面と差分を出さないこと。
        </p>
        <Link to="/_design/primitives" className="text-brand font-semibold no-underline hover:underline">
          /_design/primitives →
        </Link>
      </li>
      <li className="border border-border-soft rounded-card p-4 bg-surface">
        <h2 className="text-fs-h2 font-bold text-ink m-0 mb-2">Submit flow explorer</h2>
        <p className="text-ink-mid m-0 mb-3 text-fs-body-sm leading-relaxed">
          登録ナビの入力から導出される FlowStep を全件プレビューし、由来 (Tier1 / Tier2 / recipe) と Q1 x Q2 x 種別の到達可能性を確認する。
        </p>
        <Link to="/_design/submit-flow-explorer" className="text-brand font-semibold no-underline hover:underline">
          /_design/submit-flow-explorer →
        </Link>
      </li>
    </ul>
  </div>
)

export default DesignIndex
