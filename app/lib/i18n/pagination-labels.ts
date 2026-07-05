import { useT } from "./use-t"

export const usePaginationLabels = () => {
  const t = useT()
  return {
    ariaLabel: t("a11y.paginationNav"),
    prevLabel: t("a11y.paginationPrev"),
    nextLabel: t("a11y.paginationNext"),
    jumpToLastLabel: (n: number) => t("a11y.paginationJumpToLast", { n }),
  }
}
