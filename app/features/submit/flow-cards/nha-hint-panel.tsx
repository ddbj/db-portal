import { cn } from "~/ui"

import { ExternalLinkButton } from "../components/external-link-button"

const NHA_URL = "https://humandbs.dbcls.jp/"

export type NhaHintLabels = {
  title: string
  description: string
  statisticsLabel: string
  statisticsItems: string
  pathologyLabel: string
}

type NhaTimelineItemProps = {
  labels: NhaHintLabels
  isFirst: boolean
  externalCtaLabel: string
}

export const NhaTimelineItem = ({ labels, isFirst, externalCtaLabel }: NhaTimelineItemProps) => (
  <li data-testid="nha-hint-item" className="flex gap-2.5">
    <div className="flex flex-col items-center w-2 shrink-0">
      <div className={cn("w-0.5 h-6 shrink-0", !isFirst && "bg-border-soft")} />
      <span className="w-2 h-2 rounded-full bg-ink-softer shrink-0" />
      <div className="w-0.5 flex-1" />
    </div>

    <div className="flex-1 border border-border-soft rounded-card min-w-0 bg-surface p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-fs-body font-semibold text-ink leading-snug">
          {labels.title}
        </span>
        <p className="text-fs-micro text-ink-mid m-0 leading-relaxed">
          {labels.description}
        </p>
        <ul className="flex flex-col gap-1 m-0 list-disc list-outside pl-5">
          <li className="text-fs-body-sm text-ink leading-relaxed">
            <span className="font-semibold">{labels.statisticsLabel}</span>
            <span className="text-ink-mid"> {labels.statisticsItems}</span>
          </li>
          <li className="text-fs-body-sm text-ink leading-relaxed font-semibold">
            {labels.pathologyLabel}
          </li>
        </ul>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <ExternalLinkButton url={NHA_URL} label={externalCtaLabel} />
        </div>
      </div>
    </div>
  </li>
)
