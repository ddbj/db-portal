import { Callout } from "~/ui"

type FlowEmptyStateProps = {
  message: string
}

export const FlowEmptyState = ({ message }: FlowEmptyStateProps) => (
  <Callout tone="info">{message}</Callout>
)
