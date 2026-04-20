import { ExternalLink } from "lucide-react"

import { Badge, Heading } from "@/components/ui"

// 対応 leaf: prokaryote-raw-assembly (leaf-18)
const MicrobialGenomeDetail = () => (
  <div className="space-y-8">
    <section className="space-y-3">
      <Heading level={3}>この leaf について</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        原核生物（細菌・古細菌）のゲノム登録で、<strong>生リード + アセンブリ</strong> の両方を保有しているケース。
        生リードは DRA、アセンブリは MSS 経由で DDBJ Traditional Annotation に登録し、
        メタデータ（BioProject + BioSample）と合わせて 3 層で管理する。
        アノテーションには <strong>DFAST</strong>（原核生物ゲノム自動アノテーション）が利用可能。
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="primary">BP+BS+DRA+MSS</Badge>
        <Badge variant="gray">BioSample: Microbe</Badge>
        <Badge variant="gray">MSS data type: GNM / WGS</Badge>
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
            title: "BioSample を登録",
            desc: "D-way で BioSample パッケージ Microbe を選択し、株名・採集地などの必須項目を入力。SAMDxxxxxxx を取得する。",
          },
          {
            step: 3,
            title: "DRA に生リードを登録",
            desc: "FASTQ（または BAM）と MD5 を D-way の DRA セクションから登録する。前段の BioProject / BioSample のアクセッションを関連付ける。",
          },
          {
            step: 4,
            title: "MSS にアセンブリ配列を登録",
            desc: "MSS フォームから FASTA + タブ区切りアノテーションを申請する。完成度に応じて data type（GNM / WGS）を選択する。",
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
        <li>生リード（FASTQ または BAM）+ MD5</li>
        <li>アセンブリ配列（FASTA）</li>
        <li>アノテーションファイル（MSS 形式のタブ区切り）</li>
        <li>locus_tag prefix（登録前に決定）</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>アセンブリ完成度と MSS data type</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        完成度によって MSS の data type を選ぶ。判定の目安は以下の通り。
      </p>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li><strong>GNM（Finished）</strong> — 染色体全長相当の連続配列</li>
        <li><strong>WGS（Draft）</strong> — コンティグ or スキャフォールドの集合</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>アノテーション（DFAST）</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        DFAST は原核生物ゲノム専用の自動アノテーションパイプライン。Web UI または API から実行し、
        アノテーション済み GenBank / FASTA を生成できる。MSS フォーム提出前に結果を確認する。
      </p>
    </section>

    <section className="space-y-3">
      <Heading level={3}>詳細リンク</Heading>
      <ul className="space-y-1.5 text-sm">
        {[
          { label: "D-way（BioProject / BioSample / DRA）", url: "https://ddbj.nig.ac.jp/D-way" },
          { label: "MSS フォーム", url: "https://mss.ddbj.nig.ac.jp/" },
          { label: "DFAST — 原核生物ゲノム自動アノテーション", url: "https://dfast.ddbj.nig.ac.jp/" },
          { label: "Genome Project のデータ登録", url: "https://www.ddbj.nig.ac.jp/ddbj/genome.html" },
          { label: "MSS の登録手順", url: "https://www.ddbj.nig.ac.jp/ddbj/mss.html" },
          { label: "DRA 登録", url: "https://www.ddbj.nig.ac.jp/dra/submission.html" },
          { label: "MSS チェックツール（UME / Parser / transChecker）", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-tool.html" },
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

export default MicrobialGenomeDetail
