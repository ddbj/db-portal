// submit-alt3 chip 軸 controlled vocabulary
// SSOT: docs/submit-alt3-tags.md §5.2 / §5.2.1 / §5.2.2

import type {
  AssemblyForm,
  ButtonType,
  ChipAxis,
  ChipTag,
  FunctionalGenomics,
} from "@/types/submit-alt3"

// ----- §5.2.2 assembly-form -> functional-genomics 自動推測 -----

export const ASSEMBLY_FORM_TO_FUNCTIONAL_GENOMICS: Readonly<
  Record<AssemblyForm, FunctionalGenomics>
> = {
  "wgs": "wgs-target",
  "gnm": "wgs-target",
  "htg": "wgs-target",
  "tsa": "tsa-target",
  "htc": "tsa-target",
  "est": "tsa-target",
  "mag": "metagenome-target",
  "sag": "metagenome-target",
  "tls": "other",
  "gss": "other",
  "syn": "other",
  "misc": "other",
  "ask": "other",
}

// ----- §5.2.1 ButtonType ごとの固定 functional-genomics 既定値 -----
// (modal 質問なしで自動付与される ButtonType のみ。
//  sequence-read は modal Q1/Q2 で確定するため未定義、
//  assembled は assembly-form 経由で決まるため未定義。)

export const BUTTON_TYPE_FIXED_FUNCTIONAL_GENOMICS: Readonly<
  Partial<Record<ButtonType, FunctionalGenomics>>
> = {
  "expression-array": "yes",
  "expression-matrix": "yes",
  "spatial-tx": "yes",
  "annotation": "other",
  "phenotype": "other",
  "variation": "variation-target",
  "mass-spec": "other",
}

// ----- chip 軸の依存関係 (従属 chip) -----
// 主軸が表に存在する時のみ従属軸を表示。

export const DEPENDENT_CHIP_AXES: Readonly<
  Record<ChipAxis, { dependsOnAxis: ChipAxis; dependsOnValue: string } | null>
> = {
  "assembly-form": null,
  "provenance": null,
  "variation-form": null,
  "variation-type": null,
  "haplotype-mode": null,
  "functional-genomics": null,
  "mass-spec-domain": null,
  "spatial-platform": null,
  "tpa-subtype": { dependsOnAxis: "provenance", dependsOnValue: "third-party" },
  "haplotype-naming": {
    dependsOnAxis: "haplotype-mode",
    dependsOnValue: "phased",
  },
}

// ----- ChipAxis ごとの値域 (string array) -----
// tags.md §5.2 に基づく。表示ラベルは i18n key (chips.<axis>.values.<value>) 経由。

import {
  ASSEMBLY_FORMS,
  FUNCTIONAL_GENOMICS_VALUES,
  HAPLOTYPE_MODES,
  HAPLOTYPE_NAMINGS,
  MASS_SPEC_DOMAINS,
  PROVENANCES,
  SPATIAL_PLATFORMS,
  TPA_SUBTYPES,
  VARIATION_FORMS,
  VARIATION_TYPES,
} from "@/types/submit-alt3"

export const CHIP_AXIS_VALUES: Readonly<Record<ChipAxis, readonly string[]>> = {
  "assembly-form": ASSEMBLY_FORMS,
  "provenance": PROVENANCES,
  "variation-form": VARIATION_FORMS,
  "variation-type": VARIATION_TYPES,
  "haplotype-mode": HAPLOTYPE_MODES,
  "functional-genomics": FUNCTIONAL_GENOMICS_VALUES,
  "mass-spec-domain": MASS_SPEC_DOMAINS,
  "spatial-platform": SPATIAL_PLATFORMS,
  "tpa-subtype": TPA_SUBTYPES,
  "haplotype-naming": HAPLOTYPE_NAMINGS,
}

// ----- chip 配列ヘルパ -----

// chipTags から特定 axis の値を抜き出す
export const getChipValue = (
  chipTags: readonly ChipTag[],
  axis: ChipAxis,
): string | undefined => chipTags.find((c) => c.axis === axis)?.value

// chip axis の従属関係を満たしているか
export const isChipAxisActive = (
  chipTags: readonly ChipTag[],
  axis: ChipAxis,
): boolean => {
  const dep = DEPENDENT_CHIP_AXES[axis]
  if (dep === null) return true

  return getChipValue(chipTags, dep.dependsOnAxis) === dep.dependsOnValue
}

// chip 配列を upsert (axis が既にあれば置換、無ければ追加)
export const upsertChip = (
  chipTags: readonly ChipTag[],
  next: ChipTag,
): ChipTag[] => {
  const idx = chipTags.findIndex((c) => c.axis === next.axis)
  if (idx === -1) return [...chipTags, next]
  const cp = chipTags.slice()
  cp[idx] = next

  return cp
}

// 特定 axis を削除
export const removeChip = (
  chipTags: readonly ChipTag[],
  axis: ChipAxis,
): ChipTag[] => chipTags.filter((c) => c.axis !== axis)
