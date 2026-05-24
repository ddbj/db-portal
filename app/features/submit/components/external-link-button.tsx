import { Button, ExternalIcon } from "~/ui"

type ExternalLinkButtonProps = {
  url: string
  label: string
}

const openExternal = (url: string) => {
  if (typeof window === "undefined") return
  window.open(url, "_blank", "noopener,noreferrer")
}

export const ExternalLinkButton = ({ url, label }: ExternalLinkButtonProps) => (
  <Button
    kind="secondary"
    size="sm"
    onClick={() => openExternal(url)}
  >
    <span className="inline-flex items-center gap-1.5">
      {label}
      <ExternalIcon size={12} />
    </span>
  </Button>
)
