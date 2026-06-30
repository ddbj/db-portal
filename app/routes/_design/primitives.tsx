import type { ReactNode } from "react"
import { useState } from "react"

import {
  AppliedFilters,
  Button,
  Callout,
  Chip,
  Combobox,
  DateFacet,
  Examples,
  FacetGroup,
  FacetRow,
  FmtCheck,
  FmtRadio,
  FormGroup,
  Heading,
  IconButton,
  Label,
  LinkCard,
  Mark,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPreview,
  PageTitle,
  Pagination,
  PreviewCard,
  SearchBox,
  Section,
  SectionHeading,
  Select,
  SidebarGroupLabel,
  SidebarHeading,
  Tag,
  TextArea,
  TextInput,
  TextLink,
} from "~/ui"
import {
  ChevronDownIcon,
  CloseIcon,
  ExternalIcon,
  FileTextIcon,
  FolderIcon,
  GlobeIcon,
  HashIcon,
  InfoIcon,
  SearchIcon,
  UserIcon,
} from "~/ui"

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <Section padY="sm">
    <SectionHeading>{title}</SectionHeading>
    <div className="space-y-3">{children}</div>
  </Section>
)

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-4 flex-wrap py-1">
    <span className="font-mono text-fs-label text-ink-mid w-40 shrink-0">{label}</span>
    <div className="flex items-center gap-3 flex-wrap">{children}</div>
  </div>
)

const ButtonGallery = () => (
  <Block title="Button">
    {(["primary", "secondary", "danger", "ghost", "accent"] as const).map((kind) => (
      <Row key={kind} label={`kind=${kind}`}>
        <Button kind={kind} size="sm">{kind} sm</Button>
        <Button kind={kind} size="md">{kind} md</Button>
        <Button kind={kind} size="lg">{kind} lg</Button>
        <Button kind={kind} disabled>disabled</Button>
      </Row>
    ))}
    <Row label="pill (rounded-full)">
      <Button kind="accent" pill>accent pill</Button>
      <Button kind="primary" pill aria-pressed>primary pill (pressed)</Button>
    </Row>
    <Row label="kind=link">
      <Button kind="link">link</Button>
      <Button kind="link" disabled>disabled</Button>
    </Row>
    <Row label="block (w-full)">
      <div className="w-80">
        <Button block kind="secondary">block secondary</Button>
      </div>
    </Row>
    <Row label="IconButton size">
      <IconButton ariaLabel="閉じる (default 26)">
        <CloseIcon size={14} />
      </IconButton>
      <IconButton ariaLabel="閉じる (size 44 touch target)" size={44}>
        <CloseIcon size={18} />
      </IconButton>
      <IconButton ariaLabel="閉じる (disabled)" disabled>
        <CloseIcon size={14} />
      </IconButton>
    </Row>
  </Block>
)

const TagGallery = () => (
  <Block title="Tag">
    <Row label="kind=tag (size)">
      <Tag size="sm">biosample (sm)</Tag>
      <Tag size="md">biosample (md)</Tag>
      <Tag size="sm" mono>WGS (mono)</Tag>
    </Row>
    <Row label="kind=brand">
      <Tag kind="brand">提案</Tag>
      <Tag kind="brand" mono>AND</Tag>
    </Row>
    <Row label="kind=source">
      <Tag kind="source" name="DDBJ" />
      <Tag kind="source" name="DBCLS" />
      <Tag kind="source" name="DDBJ" size="md" />
    </Row>
    <Row label="kind=status (tone)">
      <Tag kind="status" tone="critical">重要</Tag>
      <Tag kind="status" tone="warning">未設定</Tag>
      <Tag kind="status" tone="success">完了</Tag>
      <Tag kind="status" tone="info">情報</Tag>
    </Row>
    <Row label="kind=status (size md)">
      <Tag kind="status" tone="critical" size="md">重要 (md)</Tag>
      <Tag kind="status" tone="warning" size="md" mono>WARN (mono)</Tag>
    </Row>
  </Block>
)

const ChipGallery = () => (
  <Block title="Chip">
    <Row label="kind=example">
      <Chip kind="example" to="#">cancer</Chip>
      <Chip kind="example" to="#">homo sapiens</Chip>
    </Row>
    <Row label="kind=filter">
      <Chip kind="filter" as="button">study type</Chip>
      <Chip kind="filter" as="button" selected>study type · WGS</Chip>
    </Row>
  </Block>
)

const HeadingGallery = () => (
  <Block title="Headings & Labels">
    <SectionHeading>SectionHeading (default, no count, no action)</SectionHeading>
    <SectionHeading
      subtitle="AI クエリビルダー — heading の直下に説明文を添えたいときの subtitle prop"
      action={<TextLink to="#">編集</TextLink>}
    >
      SectionHeading with subtitle + action
    </SectionHeading>
    <SectionHeading count={755} countSuffix="件" action={<TextLink to="#">すべて見る →</TextLink>}>
      SectionHeading (3px brand bar, with count + action)
    </SectionHeading>
    <SidebarHeading>SidebarHeading (3px brand bar, action なし)</SidebarHeading>
    <SidebarHeading action={<TextLink to="#">編集</TextLink>}>
      SidebarHeading with action
    </SidebarHeading>
    <Heading bar>Heading (bar, fs-h2) — 本文 / content のセクション見出し</Heading>
    <Heading>Heading (no bar, fs-h2) — modal / card title</Heading>
    <Heading size="h3">Heading (no bar, fs-h3) — 小さめ panel 見出し</Heading>
    <SidebarGroupLabel>SIDEBAR GROUP LABEL</SidebarGroupLabel>
    <SidebarGroupLabel action={<TextLink to="#">解除</TextLink>}>
      WITH ACTION
    </SidebarGroupLabel>
    <Row label="Label">
      <Label>WHERE</Label>
      <Label as="div">NO CONDITIONS</Label>
      <Label color="var(--color-src-ddbj)">DDBJ-COLORED</Label>
      <Label size={14}>SIZE 14</Label>
    </Row>
  </Block>
)

const FormsGallery = () => (
  <Block title="Forms">
    <Row label="TextInput default">
      <TextInput ariaLabel="account-id" placeholder="DRA000001" />
    </Row>
    <Row label="TextInput mono (default state)">
      <TextInput ariaLabel="dsl-input-mono" mono defaultValue="organism:Homo sapiens" />
    </Row>
    <Row label="TextInput warn">
      <TextInput ariaLabel="dsl-input-warn" state="warn" defaultValue="invalid value" />
    </Row>
    <Row label="TextInput warn + mono">
      <TextInput ariaLabel="dsl-input-warn-mono" mono state="warn" defaultValue="organism:" />
    </Row>
    <Row label="TextArea default">
      <TextArea ariaLabel="description" placeholder="自由記述..." />
    </Row>
    <Row label="TextArea warn">
      <TextArea ariaLabel="description-warn" state="warn" defaultValue="error" />
    </Row>
    <Row label="Select default">
      <Select
        ariaLabel="field"
        options={["organism", "date_published", "title"]}
        defaultValue="organism"
        width={200}
      />
    </Row>
    <Row label="Select warn (unset)">
      <Select
        ariaLabel="organism"
        options={["", "Homo sapiens", "Mus musculus"]}
        defaultValue=""
        state="warn"
        width={200}
      />
    </Row>
    <Row label="Select size (sm / md / lg)">
      <Select size="sm" ariaLabel="select-sm" options={["sm", "md", "lg"]} defaultValue="sm" width={120} />
      <Select size="md" ariaLabel="select-md" options={["sm", "md", "lg"]} defaultValue="md" width={120} />
      <Select size="lg" ariaLabel="select-lg" options={["sm", "md", "lg"]} defaultValue="lg" width={120} />
    </Row>
    <Row label="TextInput size (sm / md / lg)">
      <TextInput size="sm" ariaLabel="ti-sm" placeholder="sm" width={120} />
      <TextInput size="md" ariaLabel="ti-md" placeholder="md" width={120} />
      <TextInput size="lg" ariaLabel="ti-lg" placeholder="lg" width={120} />
    </Row>
    <Row label="Select md + TextInput md (builder 調和 = 同じ高さ)">
      <Select size="md" ariaLabel="harmony-select" options={["title", "organism_name"]} defaultValue="title" width={160} />
      <TextInput size="md" ariaLabel="harmony-input" placeholder="値を入力" width={200} />
    </Row>
    <ComboboxRow />
    <Row label="Combobox warn (構文エラー枠)">
      <Combobox
        ariaLabel="combobox-warn"
        options={[{ value: "WGS", label: "WGS", count: 8481091 }]}
        value="invalid"
        onChange={() => undefined}
        state="warn"
        width={232}
      />
    </Row>
    <FormGroup num="1." label="ライブラリ構造" hint="単独 radio (sub なし vs sub あり)">
      <FmtRadio name="lib" label="pair-end (checked + sub なし)" defaultChecked />
      <FmtRadio name="lib" label="single-end" sub="補足説明 (unchecked + sub)" />
      <FmtRadio name="lib" label="10x Genomics (unchecked + sub なし)" />
    </FormGroup>
    <FormGroup num="2." label="オプション" optional hint="複数選択可">
      <FmtCheck label="hybrid assembly (checked + sub なし)" defaultChecked />
      <FmtCheck label="raw signal" sub="生波形を残す (unchecked + sub)" />
    </FormGroup>
  </Block>
)

// Editable, filterable combobox (the builder's facet value input): typing filters
// the candidates yet any free-entry value is still accepted.
const ComboboxRow = () => {
  const [value, setValue] = useState("")

  return (
    <Row label="Combobox (filter + 自由入力 + 件数)">
      <Combobox
        ariaLabel="combobox-facet"
        options={[
          { value: "WGS", label: "WGS", count: 8481091 },
          { value: "AMPLICON", label: "AMPLICON", count: 17275513 },
          { value: "RNA-Seq", label: "RNA-Seq", count: 6629341 },
          { value: "9606", label: "Homo sapiens (9606)", count: 20253242 },
        ]}
        value={value}
        onChange={setValue}
        placeholder="値を入力"
        emptyLabel="該当なし"
        width={232}
      />
    </Row>
  )
}

const CardGallery = () => (
  <Block title="LinkCard">
    <Row label="internal">
      <LinkCard to="#">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-12 h-12 rounded-card bg-surface-subtle border border-border-soft inline-flex items-center justify-center text-brand">
            <SearchIcon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-fs-body font-bold text-ink">内部リンクカード</div>
            <div className="text-fs-body-sm text-ink-mid">RR の Link 経由で navigate</div>
          </div>
        </div>
      </LinkCard>
    </Row>
    <Row label="external">
      <LinkCard external href="https://www.ddbj.nig.ac.jp">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-12 h-12 rounded-card bg-surface-subtle border border-border-soft inline-flex items-center justify-center text-brand">
            <GlobeIcon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-fs-body font-bold text-ink inline-flex items-center gap-1.5">
              外部リンクカード
              <ExternalIcon size={12} aria-hidden />
            </div>
            <div className="text-fs-body-sm text-ink-mid">target=_blank で別タブ</div>
          </div>
        </div>
      </LinkCard>
    </Row>
  </Block>
)

const FacetGallery = () => (
  <div className="border border-border-soft rounded-card p-4 bg-surface w-80">
    <Block title="Facets">
      <AppliedFilters
        applied={[
          { label: "種別", value: "ニュース", onClear: () => undefined },
          { label: "ソース", value: "DDBJ", onClear: () => undefined },
        ]}
        onClearAll={() => undefined}
      />
      <FacetGroup label="生物種 (checkbox + showMore)" showMore onShowMore={() => undefined}>
        <FacetRow label="Homo sapiens" count={1234} defaultChecked />
        <FacetRow label="Mus musculus" count={567} />
        <FacetRow label="Escherichia coli" count={89} />
      </FacetGroup>
      <FacetGroup label="ソース (swatch + appliedCount)" appliedCount={1} onClear={() => undefined}>
        <FacetRow label="DDBJ" swatch="var(--color-src-ddbj)" count={42} defaultChecked />
        <FacetRow label="DBCLS" swatch="var(--color-src-dbcls)" count={18} />
      </FacetGroup>
      <FacetGroup label="DB タイプ (radio)">
        <FacetRow type="radio" name="db-type" label="BioProject" count={120} defaultChecked />
        <FacetRow type="radio" name="db-type" label="BioSample" count={84} />
      </FacetGroup>
      <FacetGroup label="library (compact + mono + sub)">
        <FacetRow label="WGS" mono compact sub="全ゲノム" count={42} />
        <FacetRow label="RNA-Seq" mono compact sub="トランスクリプトーム" count={31} />
      </FacetGroup>
      <DateFacet appliedCount={0} />
      <DateFacet active="1y" appliedCount={1} onClear={() => undefined} />
      <DateFacet active="5y" appliedCount={1} onClear={() => undefined} />
      <DateFacet active="10y" appliedCount={1} onClear={() => undefined} />
      <AppliedFilters applied={[]} />
    </Block>
  </div>
)

const CalloutGallery = () => (
  <Block title="Callout">
    <Callout tone="info">info: 通知メッセージ</Callout>
    <Callout tone="warn">warn: 注意メッセージ</Callout>
    <Callout tone="ok">ok: 成功メッセージ</Callout>
    <Callout tone="warn" role="alert">warn + role=alert: SR に即時アナウンス</Callout>
    <Callout tone="ok" role="status">ok + role=status: 状態変化を SR に通知</Callout>
    <Callout
      tone="warn"
      action={<Button kind="secondary" size="sm" onClick={() => undefined}>再試行</Button>}
    >
      warn + action: 右端に操作 (例 再試行)
    </Callout>
  </Block>
)

const ModalDemo = () => {
  const [openTwo, setOpenTwo] = useState(false)
  const [openOne, setOpenOne] = useState(false)
  const [openLocked, setOpenLocked] = useState(false)
  return (
    <Block title="Modal">
      <Row label="cols=2 (eyebrowTag + eyebrowMeta + description + ModalPreview)">
        <Button onClick={() => setOpenTwo(true)}>2-col modal を開く</Button>
      </Row>
      <Row label="cols=1 (minimal、ModalPreview なし)">
        <Button kind="secondary" onClick={() => setOpenOne(true)}>1-col modal を開く</Button>
      </Row>
      <Row label="closeOnOverlay/Escape=false (確認ダイアログ)">
        <Button kind="danger" onClick={() => setOpenLocked(true)}>確認ダイアログを開く</Button>
      </Row>
      <Modal open={openTwo} onClose={() => setOpenTwo(false)} ariaLabelledby="design-modal-2-title">
        <ModalHeader
          title="データ詳細を入力"
          titleId="design-modal-2-title"
          description="登録対象に応じて必要な項目を入力します。"
          onClose={() => setOpenTwo(false)}
          eyebrowTag={<Tag size="sm">配列リード</Tag>}
          eyebrowMeta="sample.fq.gz · 2.4 GB"
        />
        <ModalBody cols={2}>
          <div className="flex-1 p-5">
            <FormGroup num="1." label="ライブラリ構造">
              <FmtRadio name="modal-lib" label="pair-end" defaultChecked />
              <FmtRadio name="modal-lib" label="single-end" />
            </FormGroup>
          </div>
          <ModalPreview label="この設定で組まれる登録">
            <PreviewCard
              source="DDBJ"
              db="BioProject"
              title="新規プロジェクト"
              body="提供フローを構成"
            />
            <PreviewCard
              source="DDBJ"
              db="BioSample"
              title="サンプル登録"
              body="生物種情報"
              active={false}
            />
          </ModalPreview>
        </ModalBody>
        <ModalFooter
          status="未保存"
          actions={
            <>
              <Button kind="secondary" size="sm" onClick={() => setOpenTwo(false)}>
                キャンセル
              </Button>
              <Button kind="primary" size="sm" onClick={() => setOpenTwo(false)}>
                保存
              </Button>
            </>
          }
        />
      </Modal>
      <Modal
        open={openOne}
        onClose={() => setOpenOne(false)}
        ariaLabelledby="design-modal-1-title"
        width={520}
      >
        <ModalHeader
          title="セクション名 (h3)"
          titleId="design-modal-1-title"
          onClose={() => setOpenOne(false)}
          as="h3"
        />
        <ModalBody>
          <p className="px-5 py-4 text-fs-body text-ink m-0 leading-relaxed">
            cols=1 (default) + as=h3 の組合せ。eyebrow / description / ModalPreview なしの最小構成。
          </p>
        </ModalBody>
        <ModalFooter
          actions={
            <Button kind="primary" size="sm" onClick={() => setOpenOne(false)}>
              閉じる
            </Button>
          }
        />
      </Modal>
      <Modal
        open={openLocked}
        onClose={() => setOpenLocked(false)}
        ariaLabelledby="design-modal-locked-title"
        ariaDescribedby="design-modal-locked-desc"
        width={420}
        closeOnOverlay={false}
        closeOnEscape={false}
      >
        <ModalHeader
          title="削除しますか?"
          titleId="design-modal-locked-title"
          onClose={() => setOpenLocked(false)}
          closeLabel="キャンセル"
        />
        <ModalBody>
          <p
            id="design-modal-locked-desc"
            className="px-5 py-4 text-fs-body text-ink m-0 leading-relaxed"
          >
            overlay click / Esc では閉じない。明示的なボタン操作のみ受け付ける。
          </p>
        </ModalBody>
        <ModalFooter
          actions={
            <>
              <Button kind="secondary" size="sm" onClick={() => setOpenLocked(false)}>
                キャンセル
              </Button>
              <Button kind="danger" size="sm" onClick={() => setOpenLocked(false)}>
                削除する
              </Button>
            </>
          }
        />
      </Modal>
    </Block>
  )
}

const PaginationGallery = () => {
  const [page, setPage] = useState(3)
  return (
    <Block title="Pagination">
      <Row label="page=3 / 50 (中間、ellipsis + 末尾ジャンプ)">
        <Pagination page={page} totalPages={50} onPageChange={setPage} />
      </Row>
      <Row label="page=1 / 3 (short、前ボタン disabled)">
        <Pagination page={1} totalPages={3} onPageChange={() => undefined} />
      </Row>
      <Row label="page=1 / 1 (前後とも disabled)">
        <Pagination page={1} totalPages={1} onPageChange={() => undefined} />
      </Row>
      <Row label="page=50 / 50 (末尾、次ボタン disabled)">
        <Pagination page={50} totalPages={50} onPageChange={() => undefined} />
      </Row>
    </Block>
  )
}

const SearchBoxGallery = () => (
  <Block title="SearchBox">
    <Row label="lg + showScope=false (TOP hero)">
      <SearchBox
        size="lg"
        showSearchIcon
        showScope={false}
        maxWidth={880}
        onSubmit={() => undefined}
      />
    </Row>
    <Row label="lg + showScope (lg + scope)">
      <SearchBox
        size="lg"
        showScope
        scopeOptions={["全データベース", "BioProject", "BioSample"]}
        maxWidth={880}
        onSubmit={() => undefined}
      />
    </Row>
    <Row label="md + showScope (form 統一 30px)">
      <SearchBox
        size="md"
        showScope
        scopeOptions={["全データベース", "BioProject", "BioSample"]}
        onSubmit={() => undefined}
      />
    </Row>
    <Row label="md + showScope=false">
      <SearchBox
        size="md"
        showScope={false}
        onSubmit={() => undefined}
      />
    </Row>
    <Row label="md + invalid (構文エラー時の枠)">
      <SearchBox
        size="md"
        showScope={false}
        invalid
        onSubmit={() => undefined}
      />
    </Row>
    <Row label="tone=ai + trailing + scope 流用 (生成モード、既存に追加 を disable)">
      <SearchBox
        size="lg"
        showSearchIcon={false}
        maxWidth={680}
        tone="ai"
        scope="新規生成"
        scopeOptions={["新規生成", "既存に追加"]}
        disabledScopeOptions={["既存に追加"]}
        scopeAriaLabel="生成モード"
        submitLabel="生成"
        trailing={<Button kind="primary" size="md" pill aria-pressed>AI クエリビルダー</Button>}
        onSubmit={() => undefined}
      />
    </Row>
  </Block>
)

const ExamplesGallery = () => (
  <Block title="Examples">
    <Row label="例: chips (sans)">
      <Examples label="例" items={["cancer", "Homo sapiens", "PRJDB*"]} onPick={() => undefined} />
    </Row>
    <Row label="例: chips (mono)">
      <Examples
        label="例"
        items={["title:\"single cell\"", "date_published:[2022-01-01 TO 2024-12-31]"]}
        onPick={() => undefined}
        mono
      />
    </Row>
  </Block>
)

const TextLinkGallery = () => (
  <Block title="TextLink">
    <Row label="internal">
      <TextLink to="/news">ニュース一覧へ</TextLink>
    </Row>
    <Row label="external">
      <TextLink href="https://www.ddbj.nig.ac.jp" external externalSrLabel="external link">
        DDBJ 本体サイト
      </TextLink>
    </Row>
    <Row label="weight=normal">
      <TextLink to="#" weight="normal">細字リンク</TextLink>
    </Row>
    <Row label="weight=bold">
      <TextLink to="#" weight="bold">太字リンク</TextLink>
    </Row>
  </Block>
)

const MarkGallery = () => (
  <Block title="Mark (search highlight)">
    <Row label="single term">
      <p className="text-fs-body text-ink m-0">
        <Mark
          text="BioProject はプロジェクトの情報を束ねるカタログです。"
          terms={["プロジェクト"]}
        />
      </p>
    </Row>
    <Row label="multiple terms">
      <p className="text-fs-body text-ink m-0">
        <Mark
          text="DDBJ Sequence Read Archive の登録手順とアクセッション番号"
          terms={["DDBJ", "登録"]}
        />
      </p>
    </Row>
    <Row label="empty terms (passthrough)">
      <p className="text-fs-body text-ink m-0">
        <Mark text="No highlight should appear here." terms={[]} />
      </p>
    </Row>
  </Block>
)

const IconGallery = () => (
  <Block title="Icons">
    <Row label="機能アイコン">
      <ChevronDownIcon size={16} title="開閉" />
      <CloseIcon size={16} title="閉じる" />
      <SearchIcon size={16} title="検索" />
      <GlobeIcon size={16} title="言語切替" />
      <UserIcon size={16} title="ユーザー" />
      <ExternalIcon size={12} title="外部リンク" />
      <InfoIcon size={16} title="情報" />
    </Row>
    <Row label="ドキュメント (docs hub)">
      <FolderIcon size={16} title="ディレクトリ" className="text-brand" />
      <FileTextIcon size={16} title="ドキュメント" className="text-brand" />
      <HashIcon size={16} title="見出しアンカー" className="text-brand-deep" />
    </Row>
    <Row label="size=24 (拡大表示)">
      <ChevronDownIcon size={24} />
      <CloseIcon size={24} />
      <SearchIcon size={24} />
      <GlobeIcon size={24} />
      <UserIcon size={24} />
      <ExternalIcon size={24} />
      <InfoIcon size={24} />
      <FolderIcon size={24} className="text-brand" />
      <FileTextIcon size={24} className="text-brand" />
      <HashIcon size={24} className="text-brand-deep" />
    </Row>
  </Block>
)

const DesignPrimitives = () => (
  <div>
    <PageTitle eyebrow="Design / Primitives" title="UI primitives" />
    <ButtonGallery />
    <TagGallery />
    <ChipGallery />
    <ExamplesGallery />
    <HeadingGallery />
    <FormsGallery />
    <FacetGallery />
    <CalloutGallery />
    <ModalDemo />
    <PaginationGallery />
    <SearchBoxGallery />
    <CardGallery />
    <TextLinkGallery />
    <MarkGallery />
    <IconGallery />
  </div>
)

export default DesignPrimitives
