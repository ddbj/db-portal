import { useEffect } from "react"

const addCopyButtons = (container: HTMLElement): void => {
  const pres = container.querySelectorAll("pre")
  for (const pre of pres) {
    if (pre.querySelector(".copy-btn")) continue
    const code = pre.querySelector("code")
    if (!code) continue

    const btn = document.createElement("button")
    btn.className = "copy-btn"
    btn.type = "button"
    btn.setAttribute("aria-label", "Copy code")
    btn.addEventListener("click", () => {
      const text = code.textContent ?? ""
      void navigator.clipboard.writeText(text).then(() => {
        btn.dataset.copied = "true"
        setTimeout(() => {
          delete btn.dataset.copied
        }, 1500)
      })
    })
    pre.appendChild(btn)
  }
}

// Run-scoped unique id を生成する (mermaid は global singleton。 同 id を別 run で
// 渡すと内部 state が衝突して描画失敗する)。
let mermaidRunSeq = 0

const renderMermaid = async (
  container: HTMLElement,
  isCancelled: () => boolean,
): Promise<void> => {
  const blocks = container.querySelectorAll<HTMLElement>("code.language-mermaid")
  if (blocks.length === 0) return

  const { default: mermaid } = await import("mermaid")
  if (isCancelled()) return
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    fontFamily: "var(--font-sans), -apple-system, sans-serif",
    themeVariables: {
      fontSize: "13px",
    },
    flowchart: {
      nodeSpacing: 24,
      rankSpacing: 32,
      padding: 8,
    },
  })

  const runId = ++mermaidRunSeq
  let counter = 0
  for (const block of blocks) {
    const pre = block.parentElement
    if (!pre || pre.tagName !== "PRE") continue
    const source = block.textContent ?? ""
    counter++
    const id = `mermaid-run${runId}-${counter}`
    try {
      const { svg } = await mermaid.render(id, source)
      if (isCancelled()) return
      const wrapper = document.createElement("div")
      wrapper.className = "mermaid-diagram"
      wrapper.innerHTML = svg
      pre.replaceWith(wrapper)
    } catch {
      // leave the code block as-is
    }
  }
}

export const useProseEnhance = (selector: string): void => {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(selector)
    if (!el) return
    // 旧 invocation 中に component が unmount / 再 render した場合、 in-flight
    // render が DOM を書き換えるのを止め、 unique runId と合わせて global singleton
    // の id 衝突も避ける。
    let cancelled = false
    // マウント直後に dangerouslySetInnerHTML が再適用され、 挿入済みの mermaid SVG /
    // copy button が消えることがある。 再適用後の DOM にも同じ強化を当て直すため、
    // 完了を待って直列に再実行する (両関数は既強化ノードを skip するため冪等)。
    let running = false
    let pending = false
    // SSR HTML では mermaid が未 render の `<pre>` のままで、 `<ScrollRestoration>`
    // はこの高さを前提に hash 位置へジャンプする。 その後 client で mermaid が SVG に
    // 差し替わって以降のセクションが下方向にずれるため、 最初の enhance loop が沈静化
    // した時点で 1 度だけ hash target へ再スクロールし直す。
    let rescrollPending = window.location.hash !== ""
    const rescrollToHash = (): void => {
      if (!rescrollPending) return
      rescrollPending = false
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (id === "") return
      document.getElementById(id)?.scrollIntoView()
    }
    const enhance = (): void => {
      if (running) {
        pending = true

        return
      }
      running = true
      addCopyButtons(el)
      void renderMermaid(el, () => cancelled).finally(() => {
        running = false
        if (pending && !cancelled) {
          pending = false
          enhance()

          return
        }
        if (!cancelled) rescrollToHash()
      })
    }

    enhance()
    const observer = new MutationObserver(() => {
      if (!cancelled) enhance()
    })
    observer.observe(el, { childList: true, subtree: true })

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [selector])
}
