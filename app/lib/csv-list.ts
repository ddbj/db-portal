// URL query / cookie 等の comma-separated 文字列を要素配列に展開する。
// 各要素は trim され、 空要素は除かれる。 null / undefined / 空文字は []。
export const splitCsvList = (value: string | null | undefined): string[] => {
  if (!value) return []

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}
