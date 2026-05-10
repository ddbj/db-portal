import { Badge, Heading } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { MasterRefs } from "@/types/submit-alt"

interface MasterBadgeListProps {
  masters: MasterRefs
}

const FIELDS = [
  {
    key: "bpDataTypes" as const,
    labelKey: "routes.submitAlt.detail.masters.bpDataTypes",
  },
  {
    key: "bsPackages" as const,
    labelKey: "routes.submitAlt.detail.masters.bsPackages",
  },
  {
    key: "draLibrarySources" as const,
    labelKey: "routes.submitAlt.detail.masters.draLibrarySources",
  },
  {
    key: "draLibraryStrategies" as const,
    labelKey: "routes.submitAlt.detail.masters.draLibraryStrategies",
  },
  {
    key: "draInstruments" as const,
    labelKey: "routes.submitAlt.detail.masters.draInstruments",
  },
  {
    key: "geaSubmissionTypes" as const,
    labelKey: "routes.submitAlt.detail.masters.geaSubmissionTypes",
  },
  {
    key: "metabobankSubmissionTypes" as const,
    labelKey: "routes.submitAlt.detail.masters.metabobankSubmissionTypes",
  },
  {
    key: "jgaObjectTypes" as const,
    labelKey: "routes.submitAlt.detail.masters.jgaObjectTypes",
  },
  {
    key: "mssDataTypes" as const,
    labelKey: "routes.submitAlt.detail.masters.mssDataTypes",
  },
] as const

// docs/submit-alt.md L321-333 の軸補強情報を Badge 列で描画。
const MasterBadgeList = ({ masters }: MasterBadgeListProps) => {
  const { t } = useDynamicTranslation()

  const visible = FIELDS.filter((f) => {
    const arr = masters[f.key]

    return arr !== undefined && arr.length > 0
  })

  if (visible.length === 0) return null

  return (
    <section className="space-y-3">
      <Heading level={3}>
        {t("routes.submitAlt.detail.headings.masters")}
      </Heading>
      <dl className="space-y-3">
        {visible.map((f) => {
          const items = masters[f.key]
          if (items === undefined) return null

          return (
            <div
              key={f.key}
              className="flex flex-col gap-1.5 sm:flex-row sm:gap-3"
            >
              <dt className="w-56 shrink-0 text-xs font-semibold text-gray-600">
                {t(f.labelKey)}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <Badge key={item} variant="gray" size="sm">
                    {item}
                  </Badge>
                ))}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}

export default MasterBadgeList
