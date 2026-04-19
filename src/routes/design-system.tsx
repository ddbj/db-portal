import { Badge, Breadcrumb, Button, Callout, CodeBlock, Heading, InlineCode, LinkCard, Prose, Skeleton, SkeletonCard, SkeletonText, Table, TextLink } from "@/components/ui"

import type { Route } from "./+types/design-system"

export const meta = (_args: Route.MetaArgs) => {

  return [
    { title: "Design System - DDBJ DB Portal" },
    { name: "description", content: "DDBJ DB Portal Design System" },
  ]
}

// Color data
const primaryScale = [
  { step: "50" },
  { step: "100" },
  { step: "200" },
  { step: "300" },
  { step: "400" },
  { step: "500" },
  { step: "600", note: "= BSI" },
  { step: "700" },
  { step: "800" },
  { step: "900" },
  { step: "950" },
] as const

const secondaryScale = [
  { step: "50" },
  { step: "100" },
  { step: "200" },
  { step: "300" },
  { step: "400" },
  { step: "500" },
  { step: "600" },
  { step: "700" },
  { step: "800" },
  { step: "900" },
  { step: "950" },
] as const

const semanticColors = [
  { name: "success", label: "Success", cssVar: "--color-success" },
  { name: "warning", label: "Warning", cssVar: "--color-warning" },
  { name: "error", label: "Error", cssVar: "--color-error" },
  { name: "info", label: "Info", cssVar: "--color-info" },
] as const

const SH2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-16 border-b border-gray-200 pb-2 text-xl font-bold text-gray-900">{children}</h2>
)

const SH3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-10 text-xs font-semibold tracking-widest text-gray-500 uppercase">{children}</h3>
)

const GradientBar = ({ prefix, scale }: {
  prefix: string
  scale: readonly { step: string; note?: string }[]
}) => (
  <div>
    <div className="flex h-8 overflow-hidden rounded">
      {scale.map(c => (
        <div key={c.step} className="flex-1" style={{ backgroundColor: `var(--color-${prefix}-${c.step})` }} />
      ))}
    </div>
    <div className="mt-1 flex">
      {scale.map(c => (
        <div key={c.step} className="flex-1 text-center text-xs text-gray-500">
          {c.step}
          {c.note ? <span className="block text-xs text-gray-400">{c.note}</span> : null}
        </div>
      ))}
    </div>
  </div>
)

const DesignSystem = () => {

  return (
    <div className="flex-1 bg-gray-50">
      {/* Tailwind safelist */}
      <div className="hidden">
        <span className="bg-primary-50 bg-primary-100 bg-primary-200 bg-primary-300 bg-primary-400 bg-primary-500 bg-primary-600 bg-primary-700 bg-primary-800 bg-primary-900 bg-primary-950" />
        <span className="bg-secondary-50 bg-secondary-100 bg-secondary-200 bg-secondary-300 bg-secondary-400 bg-secondary-500 bg-secondary-600 bg-secondary-700 bg-secondary-800 bg-secondary-900 bg-secondary-950" />
      </div>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-end justify-between px-6 py-8">
          <div>
            <p className="text-primary-600 text-xs font-semibold tracking-widest uppercase">Design System</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">DDBJ DB Portal</h1>
          </div>
          <p className="text-xs text-gray-400">v0.3</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* ===== PAGE MOCKUPS ===== */}
        <section>
          <h2 className="text-xl font-bold text-gray-900">Page Mockups</h2>

          <SH3>トップページ</SH3>
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <div className="bg-white px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">DDBJ</span>
                  <span className="text-xs text-gray-400">DB Portal</span>
                </div>
                <nav className="flex items-center gap-6 text-sm">
                  <span className="font-medium text-gray-900">検索</span>
                  <span className="text-gray-500">登録</span>
                  <span className="text-gray-500">About</span>
                  <button type="button" className="bg-primary-600 rounded-md px-3 py-1.5 text-xs font-medium text-white">ログイン</button>
                </nav>
              </div>
            </div>
            <div className="bg-white px-8 pt-6 pb-12">
              <h2 className="text-2xl font-bold text-gray-900">DDBJ データベースを<br />横断的に検索・登録</h2>
              <p className="mt-2 text-sm text-gray-600">塩基配列・ゲノム・メタデータを一つの入口から。</p>
              <div className="mt-6 flex max-w-2xl gap-2">
                <input type="search" placeholder="キーワードまたは Accession" className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm shadow-sm" />
                <button type="button" className="bg-primary-600 hover:bg-primary-700 rounded-lg px-5 py-2.5 text-sm font-medium text-white">検索</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["すべて", "DDBJ Search", "ARSA", "TXSearch", "Metabobank"].map((db, i) => (
                  <button key={db} type="button" className={`rounded-full px-3 py-1 text-xs font-medium ${i === 0 ? "bg-primary-600 text-white" : "border border-gray-200 bg-white text-gray-600"}`}>{db}</button>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 bg-white px-8 py-8">
              <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">データベース</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[{ name: "DDBJ Search", desc: "統合検索" }, { name: "ARSA", desc: "配列検索" }, { name: "TXSearch", desc: "Taxonomy" }, { name: "Metabobank", desc: "メタボローム" }].map(db => (
                  <a key={db.name} href="#" className="group hover:border-primary-300 rounded-lg border border-gray-200 p-4 transition-all hover:-translate-y-px hover:shadow-md">
                    <div className="group-hover:text-primary-700 text-sm font-semibold text-gray-900">{db.name}</div>
                    <div className="mt-0.5 text-xs text-gray-600">{db.desc}</div>
                  </a>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 bg-white px-8 py-8">
              <h3 className="text-xs font-semibold tracking-widest text-gray-400 uppercase">登録</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {[{ title: "ゲノム登録 QuickStart", desc: "BioProject, BioSample, SRA, DDBJ Trad への登録手順" }, { title: "何を登録すればいい？", desc: "質問に答えて適切な登録先を見つける" }].map(item => (
                  <a key={item.title} href="#" className="group hover:border-primary-300 rounded-lg border border-gray-200 p-5 transition-all hover:-translate-y-px hover:shadow-md">
                    <div className="group-hover:text-primary-700 text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="mt-0.5 text-xs text-gray-600">{item.desc}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <SH3>内部ページ（hero なし）</SH3>
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <div className="bg-white px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">DDBJ</span>
                  <span className="text-xs text-gray-400">DB Portal</span>
                </div>
                <nav className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">検索</span>
                  <span className="font-medium text-gray-900">登録</span>
                  <span className="text-gray-500">About</span>
                  <button type="button" className="bg-primary-600 rounded-md px-3 py-1.5 text-xs font-medium text-white">ログイン</button>
                </nav>
              </div>
            </div>
            <div className="bg-white px-8 py-6">
              <nav className="text-xs text-gray-400">
                <a href="#" className="text-primary-600 decoration-primary-200 underline underline-offset-2">トップ</a>
                <span className="mx-1.5">/</span><span>登録</span>
                <span className="mx-1.5">/</span><span>ゲノム登録 QuickStart</span>
              </nav>
              <h2 className="mt-4 text-xl font-bold text-gray-900">ゲノム登録 QuickStart</h2>
              <p className="mt-2 text-sm text-gray-600">ゲノムデータの DDBJ への登録手順を説明します。</p>
              <div className="mt-6 h-20 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-xs leading-[5rem] text-gray-400">page content area</div>
            </div>
          </div>
        </section>

        {/* ===== TOKENS ===== */}
        <SH2>Design Tokens</SH2>
        <SH3>Primary — Purple (hue 308)</SH3>
        <p className="mt-1 text-sm text-gray-500">BSI #6F4392 を 600 に配置。</p>
        <div className="mt-3"><GradientBar prefix="primary" scale={primaryScale} /></div>

        <SH3>Secondary — Cyan Blue (hue 220)</SH3>
        <p className="mt-1 text-sm text-gray-500">紫との補色。特殊操作・注意喚起用に限定して使用。</p>
        <div className="mt-3"><GradientBar prefix="secondary" scale={secondaryScale} /></div>

        <SH3>Semantic</SH3>
        <div className="mt-3 flex flex-wrap gap-3">
          {semanticColors.map(c => (
            <div key={c.name} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
              <div className="h-5 w-5 rounded" style={{ backgroundColor: `var(${c.cssVar})` }} />
              <span className="text-sm text-gray-700">{c.label}</span>
            </div>
          ))}
        </div>

        <SH3>Secondary の使い方</SH3>
        <p className="mt-1 text-sm text-gray-500">迷ったら primary。secondary は特殊操作（外部遷移・破壊的操作・primary と区別したい局面）に限定。</p>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium text-gray-400">Primary = 一般 UI（検索・登録・ナビ・CTA）</div>
            <div className="mt-3 space-y-3">
              <button type="button" className="bg-primary-600 rounded-md px-3 py-1.5 text-xs font-medium text-white">検索する</button>
              <p className="text-sm text-gray-700"><a href="#" className="text-primary-600 decoration-primary-300 font-medium underline underline-offset-2">ゲノム登録 QuickStart</a> を見る</p>
              <div className="border-primary-400 bg-primary-50 text-primary-900 rounded border-l-4 p-3 text-xs">Step 1: BioProject を登録してください。</div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium text-gray-400">Secondary = 特殊操作・注意喚起</div>
            <div className="mt-3 space-y-3">
              <button type="button" className="bg-secondary-600 rounded-md px-3 py-1.5 text-xs font-medium text-white">外部サイトで開く ↗</button>
              <p className="text-sm text-gray-700"><a href="#" className="text-secondary-600 decoration-secondary-300 font-medium underline underline-offset-2">ddbj.nig.ac.jp の旧ページ</a>（外部遷移）</p>
              <div className="border-secondary-400 bg-secondary-50 text-secondary-900 rounded border-l-4 p-3 text-xs">この操作は取り消せません。</div>
            </div>
          </div>
        </div>

        {/* ===== TYPOGRAPHY ===== */}
        <SH2>Typography</SH2>

        <SH3>和文タイポグラフィ</SH3>
        <p className="mt-1 text-sm text-gray-500">行間 1.8、word-break: auto-phrase（文節区切り）をベースに設定。</p>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium text-gray-400">本文（text-sm, line-height 1.8）</div>
            <p className="mt-2 text-sm text-gray-700">
              DDBJ（DNA Data Bank of Japan）は、国立遺伝学研究所が運営する塩基配列データベースです。INSDC（International Nucleotide Sequence Database Collaboration）の一員として、世界中の研究者から塩基配列データを収集・提供しています。
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="text-xs font-medium text-gray-400">英和混在</div>
            <p className="mt-2 text-sm text-gray-700">
              BioProject（PRJDB12345）は研究プロジェクトの umbrella accession です。Whole Genome Shotgun（WGS）データの登録には、BioSample と Sequence Read Archive（SRA）への登録も必要です。
            </p>
          </div>
        </div>

        <SH3>Heading</SH3>
        <p className="mt-1 text-sm text-gray-500">サイズ + ウェイト + 装飾で階層を区別する。大きいほど軽く、小さいほど重くすることで緊張感を出す。</p>
        <div className="mt-3 max-w-3xl space-y-5 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <div className="text-xs text-gray-300">Heading level=1 — 大きさで存在感（font-medium）</div>
            <Heading level={1} className="mt-1">ゲノム登録 QuickStart</Heading>
          </div>
          <div>
            <div className="text-xs text-gray-300">Heading level=2 — 下線で区切り（font-semibold）</div>
            <Heading level={2} className="mt-1">1. BioProject の登録</Heading>
          </div>
          <div>
            <div className="text-xs text-gray-300">Heading level=3 — 左線アクセント（font-semibold）</div>
            <Heading level={3} className="mt-1">プロジェクト情報の入力</Heading>
          </div>
          <div>
            <div className="text-xs text-gray-300">Heading level=4 — 色 + 最大ウェイト（font-bold）</div>
            <Heading level={4} className="mt-1">必須フィールドについて</Heading>
          </div>
        </div>

        <SH3>Table</SH3>
        <p className="mt-1 text-sm text-gray-500">Prose 外でも使える共通スタイルの表。hover で行ハイライト、最終行の border なし。外枠は呼び出し側で `overflow-hidden rounded-lg border` ラップする。</p>
        <div className="mt-3 max-w-3xl overflow-hidden rounded-lg border border-gray-200 bg-white">
          <Table>
            <thead>
              <tr>
                <th>Accession</th>
                <th>Type</th>
                <th>Organism</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><InlineCode>PRJDB12345</InlineCode></td>
                <td>BioProject</td>
                <td>Homo sapiens</td>
                <td><Badge variant="success" size="sm">Public</Badge></td>
                <td>2025-04-12</td>
              </tr>
              <tr>
                <td><InlineCode>SAMD00000001</InlineCode></td>
                <td>BioSample</td>
                <td>Mus musculus</td>
                <td><Badge variant="success" size="sm">Public</Badge></td>
                <td>2025-04-10</td>
              </tr>
              <tr>
                <td><InlineCode>DRR000001</InlineCode></td>
                <td>SRA Run</td>
                <td>Oryza sativa</td>
                <td><Badge variant="warning" size="sm">Pending</Badge></td>
                <td>2025-04-09</td>
              </tr>
              <tr>
                <td><InlineCode>DRR000002</InlineCode></td>
                <td>SRA Run</td>
                <td>Drosophila melanogaster</td>
                <td><Badge variant="gray" size="sm">Draft</Badge></td>
                <td>2025-04-08</td>
              </tr>
            </tbody>
          </Table>
        </div>

        <SH3>コードブロック</SH3>
        <p className="mt-1 text-sm text-gray-500">Accession、コマンド、データフォーマットの表示用。</p>
        <div className="mt-3 max-w-3xl space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">
            インラインコード: Accession <code className="text-primary-700 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">PRJDB12345</code> を入力してください。
          </p>
          <div>
            <div className="text-xs text-gray-400">コードブロック（ダーク）</div>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm leading-relaxed text-gray-100">
              <code className="font-mono">{"COMMON    SUBMITTER\n            contact     Taro Yamada\n            institute   National Institute of Genetics"}</code>
            </pre>
          </div>
          <div>
            <div className="text-xs text-gray-400">コードブロック（ライト）</div>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">
              <code className="font-mono">$ curl https://ddbj.nig.ac.jp/search/entry/PRJDB12345</code>
            </pre>
          </div>
        </div>

        <SH3>Icon Set</SH3>
        <p className="mt-1 text-sm text-gray-500">
          Lucide Icons を推奨。軽量、MIT ライセンス、React 対応（lucide-react）。
          Heroicons も可。独自アイコンは作らない。
        </p>
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap gap-6">
            {/* Inline SVG examples showing typical icons */}
            {[
              { label: "検索", d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
              { label: "登録", d: "M12 4v16m8-8H4" },
              { label: "外部リンク", d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" },
              { label: "ダウンロード", d: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" },
              { label: "ユーザー", d: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" },
              { label: "情報", d: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 9v4m0 4h.01" },
            ].map(icon => (
              <div key={icon.label} className="flex flex-col items-center gap-1">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon.d} />
                </svg>
                <span className="text-xs text-gray-400">{icon.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400">
            アイコンは必ずテキストラベルと併用する。アイコン単体でクリッカブルにしない。
          </p>
        </div>

        {/* ===== COMPONENTS ===== */}
        <SH2>Components</SH2>

        <SH3>Button</SH3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="accent">Accent</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Default</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary">検索する</Button>
          <Button variant="secondary">外部サイトで開く</Button>
          <Button variant="tertiary">キャンセル</Button>
          <Button variant="accent">登録を始める</Button>
        </div>

        <SH3>Form Controls</SH3>
        <div className="mt-3 grid grid-cols-1 gap-6 rounded-lg border border-gray-200 bg-white p-6 lg:grid-cols-2">
          <div>
            <label htmlFor="ds-text" className="block text-sm font-medium text-gray-700">Text Input</label>
            <input id="ds-text" type="text" placeholder="キーワードを入力" className="mt-1 w-full" />
          </div>
          <div>
            <label htmlFor="ds-text-err" className="block text-sm font-medium text-gray-700">Text Input（エラー）</label>
            <input id="ds-text-err" type="text" defaultValue="invalid value" className="mt-1 w-full rounded-md border border-red-300 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none" />
            <p className="mt-1 text-xs" style={{ color: "var(--color-error)" }}>入力内容を確認してください。</p>
          </div>
          <div>
            <label htmlFor="ds-select" className="block text-sm font-medium text-gray-700">Select</label>
            <select id="ds-select" className="focus:border-primary-500 focus:ring-primary-200 mt-1 w-full rounded-md border-gray-300 text-sm">
              <option value="">選択してください</option>
              <option value="ddbj">DDBJ Search</option>
              <option value="arsa">ARSA</option>
            </select>
          </div>
          <div>
            <label htmlFor="ds-textarea" className="block text-sm font-medium text-gray-700">Textarea</label>
            <textarea id="ds-textarea" rows={3} placeholder="塩基配列を入力..." className="mt-1 w-full" />
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700">Checkbox</span>
            <div className="mt-2 space-y-2">
              {["BioProject", "BioSample", "SRA"].map(label => (
                <label key={label} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" defaultChecked={label === "BioProject"} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700">Radio</span>
            <div className="mt-2 space-y-2">
              {["ゲノム登録", "RNA-seq", "メタゲノム"].map((label, i) => (
                <label key={label} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name="ds-radio" defaultChecked={i === 0} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <SH3>LinkCard</SH3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <LinkCard to="#" title="DDBJ Search" description="塩基配列・メタデータの統合検索" linkText="詳細を見る" />
          <LinkCard to="#" title="BioProject" description="研究プロジェクトの登録・管理" linkText="詳細を見る" />
          <LinkCard external href="https://ddbj.nig.ac.jp" title="ddbj.nig.ac.jp" description="旧 DDBJ サイト（外部）" linkText="外部サイトへ" color="secondary" />
        </div>

        <SH3>Callout</SH3>
        <div className="mt-3 space-y-2">
          <Callout type="info">検索結果は最大 1000 件まで表示されます。</Callout>
          <Callout type="success">登録が完了しました。</Callout>
          <Callout type="warning">この操作は取り消せません。</Callout>
          <Callout type="error">データの取得に失敗しました。</Callout>
        </div>

        <SH3>TextLink / InlineCode</SH3>
        <div className="mt-3 max-w-2xl rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">
            ゲノムデータの登録には、
            <TextLink to="#">BioProject</TextLink>、
            <TextLink to="#">BioSample</TextLink>、
            <TextLink to="#">SRA</TextLink>
            への登録が必要です。
            Accession <InlineCode>PRJDB12345</InlineCode> で検索できます。
          </p>
        </div>

        <SH3>CodeBlock</SH3>
        <div className="mt-3 max-w-3xl space-y-3">
          <CodeBlock theme="dark">{"COMMON    SUBMITTER\n            contact     Taro Yamada\n            institute   National Institute of Genetics"}</CodeBlock>
          <CodeBlock theme="light">{"$ curl https://ddbj.nig.ac.jp/search/entry/PRJDB12345"}</CodeBlock>
        </div>

        {/* ===== PROSE ===== */}
        <SH2>Prose</SH2>
        <p className="mt-2 text-sm text-gray-500">Markdown 相当のコンテンツを自動スタイリングする CSS コンテナ。</p>
        <div className="mt-4 max-w-3xl rounded-lg border border-gray-200 bg-white p-6">
          <Prose>
            <h1>ゲノム登録 QuickStart</h1>
            <p>
              ゲノムデータの DDBJ への登録手順を説明します。登録には BioProject、BioSample、SRA、DDBJ Trad の 4 つのデータベースへの登録が必要です。
            </p>
            <h2>1. BioProject の登録</h2>
            <p>
              BioProject は研究プロジェクトの情報を管理するデータベースです。<a href="#">D-way</a> から登録できます。
            </p>
            <h3>プロジェクト情報の入力</h3>
            <p>以下のフィールドを入力してください。</p>
            <h4>必須フィールド</h4>
            <ul>
              <li>Project title</li>
              <li>Project description</li>
              <li>Relevance（Medical, Agricultural, etc.）</li>
            </ul>
            <blockquote>初めて登録する場合は、まず DDBJ Account を作成してください。</blockquote>
            <h2>2. BioSample の登録</h2>
            <p>
              BioSample は生物学的サンプルの情報を管理します。Accession は <code>SAMD00000001</code> のような形式です。
            </p>
            <table>
              <thead>
                <tr>
                  <th>フィールド</th>
                  <th>必須</th>
                  <th>説明</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>sample_name</td>
                  <td>必須</td>
                  <td>サンプル名（一意）</td>
                </tr>
                <tr>
                  <td>organism</td>
                  <td>必須</td>
                  <td>生物種</td>
                </tr>
                <tr>
                  <td>collection_date</td>
                  <td>任意</td>
                  <td>採集日</td>
                </tr>
              </tbody>
            </table>
            <pre><code>{"COMMON    SUBMITTER\n            contact     Taro Yamada"}</code></pre>
          </Prose>
        </div>

        {/* ===== NEW COMPONENTS ===== */}
        <SH2>Additional Components</SH2>

        <SH3>Badge</SH3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="primary">BioProject</Badge>
          <Badge variant="secondary">外部</Badge>
          <Badge variant="gray">Draft</Badge>
          <Badge variant="success">Complete</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="error">Error</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge size="sm" variant="primary">sm</Badge>
          <Badge size="md" variant="primary">md（default）</Badge>
        </div>

        <SH3>Breadcrumb</SH3>
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
          <Breadcrumb items={[
            { label: "トップ", to: "#" },
            { label: "登録" },
            { label: "ゲノム登録 QuickStart" },
          ]} />
        </div>

        <SH3>Skeleton / Loading</SH3>
        <p className="mt-1 text-sm text-gray-500">TanStack Query のローディング表示に使用。</p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-4 max-w-md rounded-lg border border-gray-200 bg-white p-5">
          <Skeleton className="h-5 w-1/3" />
          <div className="mt-3">
            <SkeletonText lines={4} />
          </div>
        </div>

        <div className="h-16" />
      </div>
    </div>
  )
}

export default DesignSystem
