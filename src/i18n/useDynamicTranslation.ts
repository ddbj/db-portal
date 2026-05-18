import { useTranslation } from "react-i18next"

// 動的に組み立てたキー用の t。静的キーには useTranslation を使う。
// interpolation params (`{strategy}` 等) も任意で渡せるよう Record<string, unknown> を許容する。
export const useDynamicTranslation = (): {
  t: (
  key: string,
  options?: { defaultValue?: string } & Record<string, unknown>,
  ) => string
} => {
  const { t: tStrict } = useTranslation()
  const t = tStrict as unknown as (
    key: string,
    options?: { defaultValue?: string } & Record<string, unknown>,
  ) => string

  return { t }
}
