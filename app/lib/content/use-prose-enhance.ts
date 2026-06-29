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

const renderMermaid = async (container: HTMLElement): Promise<void> => {
  const blocks = container.querySelectorAll<HTMLElement>("code.language-mermaid")
  if (blocks.length === 0) return

  const { default: mermaid } = await import("mermaid")
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

  let counter = 0
  for (const block of blocks) {
    const pre = block.parentElement
    if (!pre || pre.tagName !== "PRE") continue
    const source = block.textContent ?? ""
    counter++
    const id = `mermaid-${counter}`
    try {
      const { svg } = await mermaid.render(id, source)
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
    addCopyButtons(el)
    void renderMermaid(el)
  })
}
