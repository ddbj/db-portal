import type { ComponentType } from "react"

import type { Lang } from "@/i18n"
import type { LeafNodeId } from "@/types/submit"

import EukaryoteGenomeDetailEn from "./EukaryoteGenomeDetail.en"
import EukaryoteGenomeDetailJa from "./EukaryoteGenomeDetail.ja"
import MicrobialGenomeDetailEn from "./MicrobialGenomeDetail.en"
import MicrobialGenomeDetailJa from "./MicrobialGenomeDetail.ja"

// leaf 単位の具体レベル本文 TSX コンポーネント。言語別 2 言語セット。
// 未定義の leaf は「準備中」プレースホルダにフォールバックする。
export const DETAIL_LEAF_COMPONENTS: Partial<
  Record<LeafNodeId, Record<Lang, ComponentType>>
> = {
  "prokaryote-raw-assembly": {
    ja: MicrobialGenomeDetailJa,
    en: MicrobialGenomeDetailEn,
  },
  "eukaryote-raw-assembly": {
    ja: EukaryoteGenomeDetailJa,
    en: EukaryoteGenomeDetailEn,
  },
}

export const hasHandwrittenDetail = (leafId: LeafNodeId): boolean =>
  DETAIL_LEAF_COMPONENTS[leafId] !== undefined
