import { Button } from "~/ui"

type RowSetTagProps = {
  summary: string
  ariaLabel: string
  onClick: () => void
}

export const RowSetTag = ({ summary, ariaLabel, onClick }: RowSetTagProps) => (
  <Button kind="link" onClick={onClick} aria-label={ariaLabel}>
    <span className="inline-flex items-center gap-1 bg-brand-soft text-brand-deep border border-brand-light/50 px-2 py-0.5 rounded-button text-fs-micro font-bold">
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        aria-hidden="true"
        focusable="false"
      >
        <polyline
          points="1.5,5 4,7.5 8.5,2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {summary}
    </span>
  </Button>
)
