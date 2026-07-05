const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
// 先頭の国番号 (+CC) を 1 単位として取り込み、各桁グループを単一の区切り
// ([-\s]) で連結する。区切りは必ず数字に続くため、英字の周辺テキストへ
// 食い込まない。有効桁数の閾値判定は isLikelyPhone が担う。
const PHONE_RE = /\+?\d{1,4}(?:[-\s]\d{1,4})+/g
// (555) 123-4567 型の米国式 phone。 PHONE_RE は先頭が "(" を含まないので
// カバーしきれない。
const PHONE_PAREN_RE = /\(\d{3}\)\s?\d{3}[-\s]?\d{4}/g
// 先頭が "+" のときは国際電話のダイヤルプレフィックスとみなし、カード番号と
// しては扱わない (電話は PHONE_RE 側で redact する)。
const CCNUM_RE = /(?<!\+)\b(?:\d[ -]*?){13,19}\b/g
const TOKEN_RE = /\b(?:sk|pk|ghp|gho|github_pat|api_key)[-_][A-Za-z0-9_-]{16,}\b/g
// JWT: 3 segments of base64url separated by dots. `eyJ` は base64url encoded
// JSON header ({"alg":...) のほぼ確定 prefix なので誤検出しにくい。
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g
// AWS Access Key ID (AKIA=long-lived, ASIA=STS temporary)。
const AWS_ACCESS_KEY_RE = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g
// Slack bot / user / app / refresh token。
const SLACK_TOKEN_RE = /\bxox[abpr]-[0-9A-Za-z-]{10,}\b/g
// Google API key (Firebase / Maps / GenAI 系)。
const GOOGLE_API_KEY_RE = /\bAIza[0-9A-Za-z_-]{35}\b/g

const PHONE_MIN_DIGITS = 9

const isLikelyPhone = (match: string): boolean => {
  const digits = match.replace(/\D/g, "")

  return digits.length >= PHONE_MIN_DIGITS
}

const isLikelyCreditCard = (match: string): boolean => {
  const digits = match.replace(/\D/g, "")
  if (digits.length < 13 || digits.length > 19) return false
  // Luhn check で誤検出を抑制 (任意の長 N 桁数字列を一律 cc 扱いしない)
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }

  return sum % 10 === 0
}

const replaceConditional = (
  input: string,
  re: RegExp,
  placeholder: string,
  guard?: (match: string) => boolean,
): string => {
  re.lastIndex = 0

  return input.replace(re, (match) => (guard ? (guard(match) ? placeholder : match) : placeholder))
}

export const redactUserInput = (input: string): string => {
  let out = replaceConditional(input, EMAIL_RE, "[REDACTED_EMAIL]")
  out = replaceConditional(out, JWT_RE, "[REDACTED_TOKEN]")
  out = replaceConditional(out, AWS_ACCESS_KEY_RE, "[REDACTED_TOKEN]")
  out = replaceConditional(out, SLACK_TOKEN_RE, "[REDACTED_TOKEN]")
  out = replaceConditional(out, GOOGLE_API_KEY_RE, "[REDACTED_TOKEN]")
  out = replaceConditional(out, TOKEN_RE, "[REDACTED_TOKEN]")
  out = replaceConditional(out, CCNUM_RE, "[REDACTED_CCNUM]", isLikelyCreditCard)
  out = replaceConditional(out, PHONE_PAREN_RE, "[REDACTED_PHONE]")
  out = replaceConditional(out, PHONE_RE, "[REDACTED_PHONE]", isLikelyPhone)

  return out
}
