import type { ReactNode } from "react"
import { useState } from "react"

import {
  AppliedFilters,
  Button,
  Callout,
  Chip,
  DateFacet,
  FacetGroup,
  FacetRow,
  FmtCheck,
  FmtRadio,
  FormGroup,
  IconButton,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPreview,
  NativeSelect,
  PageTitle,
  Pagination,
  PreviewCard,
  SearchBox,
  Section,
  SectionHeading,
  SidebarGroupLabel,
  SidebarHeading,
  Tag,
  TextLink,
} from "~/ui"
import { CloseIcon, GlobeIcon, SearchIcon } from "~/ui"

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <Section padY="sm">
    <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3 pl-2.5 border-l-[3px] border-brand">
      {title}
    </h2>
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
    {(["primary", "secondary", "danger", "ghost", "link"] as const).map((kind) => (
      <Row key={kind} label={`kind=${kind}`}>
        <Button kind={kind} size="sm">{kind} sm</Button>
        <Button kind={kind} size="md">{kind} md</Button>
        <Button kind={kind} size="lg">{kind} lg</Button>
        <Button kind={kind} disabled>disabled</Button>
      </Row>
    ))}
    <Row label="IconButton">
      <IconButton ariaLabel="閉じる">
        <CloseIcon size={14} />
      </IconButton>
      <IconButton ariaLabel="閉じる (disabled)" disabled>
        <CloseIcon size={14} />
      </IconButton>
    </Row>
  </Block>
)

const TagGallery = () => (
  <Block title="Tag">
    <Row label="kind=tag">
      <Tag>biosample</Tag>
      <Tag size="md">biosample</Tag>
      <Tag mono>WGS</Tag>
    </Row>
    <Row label="kind=brand">
      <Tag kind="brand">提案</Tag>
      <Tag kind="brand" mono>AND</Tag>
    </Row>
    <Row label="kind=source">
      <Tag kind="source" name="DDBJ" />
      <Tag kind="source" name="DBCLS" />
    </Row>
    <Row label="kind=status">
      <Tag kind="status" tone="critical">重要</Tag>
      <Tag kind="status" tone="warning">未設定</Tag>
      <Tag kind="status" tone="success">完了</Tag>
      <Tag kind="status" tone="info">情報</Tag>
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
    <SectionHeading count={755} action={<TextLink to="#">すべて見る →</TextLink>}>
      SectionHeading (3px brand bar, with count + action)
    </SectionHeading>
    <SidebarHeading action={<TextLink to="#">編集</TextLink>}>
      SidebarHeading (bar 無し)
    </SidebarHeading>
    <SidebarGroupLabel>SIDEBAR GROUP LABEL</SidebarGroupLabel>
    <Row label="Label">
      <Label>WHERE</Label>
      <Label as="div">NO CONDITIONS</Label>
    </Row>
  </Block>
)

const FormsGallery = () => (
  <Block title="Forms">
    <Row label="NativeSelect default">
      <NativeSelect
        ariaLabel="field"
        options={["organism", "date_published", "title"]}
        defaultValue="organism"
        width={200}
      />
    </Row>
    <Row label="NativeSelect warn (unset)">
      <NativeSelect
        ariaLabel="organism"
        options={["", "Homo sapiens", "Mus musculus"]}
        defaultValue=""
        state="warn"
        width={200}
      />
    </Row>
    <FormGroup num="1." label="ライブラリ構造">
      <FmtRadio name="lib" label="pair-end" defaultChecked />
      <FmtRadio name="lib" label="single-end" sub="補足説明" />
      <FmtRadio name="lib" label="10x Genomics" />
    </FormGroup>
    <FormGroup num="2." label="オプション" optional hint="複数選択可">
      <FmtCheck label="hybrid assembly" defaultChecked />
      <FmtCheck label="raw signal" />
    </FormGroup>
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
      <FacetGroup label="生物種" showMore onShowMore={() => undefined}>
        <FacetRow label="Homo sapiens" count={1234} defaultChecked />
        <FacetRow label="Mus musculus" count={567} />
        <FacetRow label="Escherichia coli" count={89} />
      </FacetGroup>
      <FacetGroup label="ソース" appliedCount={1} onClear={() => undefined}>
        <FacetRow label="DDBJ" swatch="var(--color-src-ddbj)" count={42} defaultChecked />
        <FacetRow label="DBCLS" swatch="var(--color-src-dbcls)" count={18} />
      </FacetGroup>
      <DateFacet active="1y" appliedCount={1} onClear={() => undefined} />
    </Block>
  </div>
)

const CalloutGallery = () => (
  <Block title="Callout">
    <Callout tone="info">info: 通知メッセージ</Callout>
    <Callout tone="warn">warn: 注意メッセージ</Callout>
    <Callout tone="ok">ok: 成功メッセージ</Callout>
  </Block>
)

const ModalDemo = () => {
  const [open, setOpen] = useState(false)
  return (
    <Block title="Modal">
      <Row label="trigger">
        <Button onClick={() => setOpen(true)}>Modal を開く</Button>
      </Row>
      <Modal open={open} onClose={() => setOpen(false)} ariaLabelledby="design-modal-title">
        <ModalHeader
          title="データ詳細を入力"
          titleId="design-modal-title"
          description="登録対象に応じて必要な項目を入力します。"
          onClose={() => setOpen(false)}
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
              <Button kind="secondary" size="sm" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button kind="primary" size="sm" onClick={() => setOpen(false)}>
                保存
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
      <Row label="page=3 / 50">
        <Pagination page={page} totalPages={50} onPageChange={setPage} />
      </Row>
      <Row label="page=1 / 3 (short)">
        <Pagination page={1} totalPages={3} onPageChange={() => undefined} />
      </Row>
    </Block>
  )
}

const SearchBoxGallery = () => (
  <Block title="SearchBox">
    <SearchBox
      size="lg"
      showSearchIcon
      showScope={false}
      maxWidth={820}
      onSubmit={() => undefined}
    />
    <SearchBox
      size="md"
      showScope
      scopeOptions={["全データベース", "BioProject", "BioSample"]}
      onSubmit={() => undefined}
    />
  </Block>
)

const TextLinkGallery = () => (
  <Block title="TextLink">
    <Row label="internal">
      <TextLink to="/news">ニュース一覧へ</TextLink>
    </Row>
    <Row label="external">
      <TextLink href="https://www.ddbj.nig.ac.jp" external>
        DDBJ 本体サイト
      </TextLink>
    </Row>
    <Row label="icons">
      <SearchIcon size={16} title="検索" />
      <GlobeIcon size={16} title="言語切替" />
      <CloseIcon size={16} title="閉じる" />
    </Row>
  </Block>
)

const DesignPrimitives = () => (
  <div>
    <PageTitle eyebrow="Design / Primitives" title="UI primitives" />
    <ButtonGallery />
    <TagGallery />
    <ChipGallery />
    <HeadingGallery />
    <FormsGallery />
    <FacetGallery />
    <CalloutGallery />
    <ModalDemo />
    <PaginationGallery />
    <SearchBoxGallery />
    <TextLinkGallery />
  </div>
)

export default DesignPrimitives
