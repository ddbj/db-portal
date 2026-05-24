import { Button } from "~/ui"

type WarnDashedButtonProps = {
  label: string
  onClick: () => void
  ariaLabel?: string
}

export const WarnDashedButton = ({ label, onClick, ariaLabel }: WarnDashedButtonProps) => (
  <Button kind="link" onClick={onClick} aria-label={ariaLabel ?? label}>
    <span className="border border-dashed border-warn-border bg-warn-bg text-warn-fg px-2 py-0.5 rounded-button text-fs-micro font-bold">
      {label}
    </span>
  </Button>
)
