export interface ExampleChip {
  label: string
  query: string
}

export const EXAMPLE_CHIPS: readonly ExampleChip[] = [
  { label: "Homo sapiens", query: "Homo sapiens" },
  { label: "Escherichia coli", query: "Escherichia coli" },
  { label: "PRJDB10000", query: "PRJDB10000" },
  { label: "DRR000001", query: "DRR000001" },
] as const
