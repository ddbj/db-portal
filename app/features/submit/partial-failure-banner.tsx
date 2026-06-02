import { AlertIcon, Button, Callout } from "~/ui"

import type { Validation } from "./state/types"

type PartialFailureBannerProps = {
  validations: readonly Validation[]
  rowIndexOf: (entryId: string) => number
  headingText: string
  rowLabel: (index: number) => string
  validationLabel: (validation: Validation) => string
  onJumpToRow: (entryId: string) => void
}

export const PartialFailureBanner = ({
  validations,
  rowIndexOf,
  headingText,
  rowLabel,
  validationLabel,
  onJumpToRow,
}: PartialFailureBannerProps) => {
  if (validations.length === 0) return null
  return (
    <div data-testid="partial-failure-banner">
      <Callout tone="warn" role="alert">
        <p className="font-semibold m-0 flex items-center gap-1.5">
          <AlertIcon size={15} aria-hidden className="shrink-0" />
          {headingText}
        </p>
        <ul className="mt-2 flex flex-col gap-1 m-0 list-disc list-inside p-0">
          {validations.map((v, i) => {
            const idx = rowIndexOf(v.entryId)
            return (
              <li key={`${v.entryId}-${v.kind}-${i}`}>
                <span className="text-fs-body-sm">{validationLabel(v)}</span>
                {idx >= 0 && (
                  <>
                    {" "}
                    <Button kind="link" onClick={() => onJumpToRow(v.entryId)}>
                      {rowLabel(idx + 1)}
                    </Button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </Callout>
    </div>
  )
}
