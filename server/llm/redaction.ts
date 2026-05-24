const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE_RE = /(?:\+?\d{1,3}[-\s]?)?(?:\(?\d{2,4}\)?[-\s]?)?\d{2,4}[-\s]?\d{3,4}/g
const CCNUM_RE = /\b(?:\d[ -]*?){13,19}\b/g
const TOKEN_RE = /\b(?:sk|pk|ghp|gho|github_pat|api_key)[-_][A-Za-z0-9_-]{16,}\b/g

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
  out = replaceConditional(out, TOKEN_RE, "[REDACTED_TOKEN]")
  out = replaceConditional(out, CCNUM_RE, "[REDACTED_CCNUM]", isLikelyCreditCard)
  out = replaceConditional(out, PHONE_RE, "[REDACTED_PHONE]", isLikelyPhone)

  return out
}
