import { useTranslation } from "react-i18next"

// 動的に組み立てたキー用の t。静的キーには useTranslation を使う。
export const useDynamicTranslation = (): {
  t: (key: string, options?: { defaultValue?: string }) => string
} => {
  const { t: tStrict } = useTranslation()
  const t = tStrict as unknown as (
    key: string,
    options?: { defaultValue?: string },
  ) => string

  return { t }
}
