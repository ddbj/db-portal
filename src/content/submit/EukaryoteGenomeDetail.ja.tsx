import { ExternalLink } from "lucide-react"

import { Badge, Heading } from "@/components/ui"

// 対応 leaf: eukaryote-raw-assembly (leaf-26)
const EukaryoteGenomeDetail = () => (
  <div className="space-y-8">
    <section className="space-y-3">
      <Heading level={3}>この leaf について</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        真核生物（動物・植物・菌類）のゲノム登録で、<strong>生リード + アセンブリ</strong> の両方を保有しているケース。
        3 層構造（メタデータ → 生リード → アセンブリ）は微生物ゲノムと同じ。
        ただし <strong>DFAST は原核生物専用のため使えず</strong>、アノテーションは手動または既存パイプラインに依存する。
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="primary">BP+BS+DRA+MSS</Badge>
        <Badge variant="gray">BioSample: MIGS</Badge>
        <Badge variant="gray">MSS data type: GNM / WGS / HTG</Badge>
        <Badge variant="gray">locus_tag prefix 必須</Badge>
        <Badge variant="gray">Assembly Name 必須</Badge>
      </div>
    </section>

    <section className="space-y-3">
      <Heading level={3}>登録の流れ</Heading>
      <ol className="space-y-2 pl-0">
        {[
          {
            step: 1,
            title: "BioProject を登録",
            desc: "D-way から研究プロジェクト単位のメタデータを登録し、PRJDBxxxxx のアクセッションを取得する。",
          },
          {
            step: 2,
            title: "BioSample を登録（MIGS パッケージ）",
            desc: "生物種に応じて Model Organism Animal / Plant / Microbe のいずれかを選択し、qualifier を入力する。SAMDxxxxxxx を取得する。",
          },
          {
            step: 3,
            title: "DRA に生リードを登録",
            desc: "FASTQ / BAM と MD5 を D-way の DRA セクションから登録する。前段アクセッションを関連付ける。",
          },
          {
            step: 4,
            title: "MSS にアセンブリ配列を登録",
            desc: "MSS フォームから FASTA + アノテーション（タブ区切り）を申請。完成度に応じて data type（GNM / WGS / HTG）を選択する。locus_tag prefix と Assembly Name は必須。",
          },
        ].map((s) => (
          <li
            key={s.step}
            className="flex gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <span className="bg-primary-100 text-primary-700 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {s.step}
            </span>
            <div>
              <div className="text-sm font-semibold text-gray-900">{s.title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    <section className="space-y-3">
      <Heading level={3}>準備するもの</Heading>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li>DDBJ Account、SSH 公開鍵</li>
        <li>生リード（FASTQ / BAM）+ MD5</li>
        <li>アセンブリ配列（FASTA）</li>
        <li>アノテーションファイル（MSS 形式のタブ区切り）</li>
        <li>locus_tag prefix（登録前に決定）</li>
        <li>Assembly Name（登録前に決定、後の更新で識別子として使われる）</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>生物種ごとの BioSample パッケージ・qualifier</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        真核生物は動物 / 植物 / 菌類で適切な BioSample パッケージと qualifier が異なる。
      </p>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li><strong>動物</strong> — BioSample: Model Organism Animal / MIGS。qualifier: <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">breed</code>、<code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">strain</code>、<code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">isolate</code> 等</li>
        <li><strong>植物</strong> — BioSample: Plant / MIGS。qualifier: <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">cultivar</code>、<code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">ecotype</code> 等</li>
        <li><strong>菌類</strong> — BioSample: Microbe / MIGS。qualifier: <code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">strain</code>、<code className="text-primary-700 rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px]">isolate</code> 等</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>アセンブリ完成度と MSS data type</Heading>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li><strong>GNM（Finished）</strong> — 染色体全長相当の連続配列</li>
        <li><strong>WGS（Draft）</strong> — コンティグ or スキャフォールドの集合</li>
        <li><strong>HTG（BAC / YAC / fosmid ドラフト）</strong> — Phase 0 / 1 / 2 の中間完成度</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>詳細リンク</Heading>
      <ul className="space-y-1.5 text-sm">
        {[
          { label: "D-way（BioProject / BioSample / DRA）", url: "https://ddbj.nig.ac.jp/D-way" },
          { label: "MSS フォーム", url: "https://mss.ddbj.nig.ac.jp/" },
          { label: "Genome Project のデータ登録", url: "https://www.ddbj.nig.ac.jp/ddbj/genome.html" },
          { label: "Transcriptome Project のデータ登録（TSA 関連）", url: "https://www.ddbj.nig.ac.jp/ddbj/transcriptome.html" },
          { label: "MSS の登録手順", url: "https://www.ddbj.nig.ac.jp/ddbj/mss.html" },
          { label: "DRA 登録", url: "https://www.ddbj.nig.ac.jp/dra/submission.html" },
        ].map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 decoration-primary-300 hover:text-primary-800 hover:decoration-primary-600 inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
            >
              {link.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  </div>
)

export default EukaryoteGenomeDetail
