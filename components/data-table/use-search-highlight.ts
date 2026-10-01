"use client"

import * as React from "react"

/**
 * Paints search matches inside every visible cell using the CSS Custom
 * Highlight API — no <mark> elements, so custom cell renderers (badges, links,
 * formatted IDs) need no cooperation and React's DOM is never touched.
 * Browsers without the API simply show no highlight.
 *
 * Every table on the page shares one named highlight ("dt-search"); each
 * instance contributes its own ranges.
 */

const HIGHLIGHT_NAME = "dt-search"
const MAX_RANGES = 1500
const registry = new Map<symbol, Range[]>()

interface HighlightRegistry {
  set(name: string, value: unknown): void
  delete(name: string): void
}

function highlightApi(): { registry: HighlightRegistry; Highlight: new (...ranges: Range[]) => unknown } | null {
  if (typeof window === "undefined") return null
  const css = (window as unknown as { CSS?: { highlights?: HighlightRegistry } }).CSS
  const Ctor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight
  if (!css?.highlights || !Ctor) return null
  return { registry: css.highlights, Highlight: Ctor }
}

function publish() {
  const api = highlightApi()
  if (!api) return
  const all: Range[] = []
  registry.forEach((ranges) => all.push(...ranges))
  if (all.length === 0) api.registry.delete(HIGHLIGHT_NAME)
  else api.registry.set(HIGHLIGHT_NAME, new api.Highlight(...all))
}

export function useSearchHighlight(
  rootRef: React.RefObject<HTMLElement | null>,
  term: string,
  enabled: boolean
) {
  const keyRef = React.useRef<symbol>(Symbol("dt"))

  React.useEffect(() => {
    const key = keyRef.current
    const root = rootRef.current
    const terms = term
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0)
    if (!enabled || !root || terms.length === 0 || !highlightApi()) {
      if (registry.delete(key)) publish()
      return
    }

    let frame = 0
    const run = () => {
      const ranges: Range[] = []
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          (node.parentElement?.closest("[data-dt-cell]") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
      })
      let node: Node | null
      outer: while ((node = walker.nextNode())) {
        const text = node.nodeValue?.toLowerCase()
        if (!text) continue
        for (const t of terms) {
          let at = text.indexOf(t)
          while (at !== -1) {
            const range = document.createRange()
            range.setStart(node, at)
            range.setEnd(node, at + t.length)
            ranges.push(range)
            if (ranges.length >= MAX_RANGES) break outer
            at = text.indexOf(t, at + t.length)
          }
        }
      }
      registry.set(key, ranges)
      publish()
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(run)
    }
    schedule()
    // Rows come and go (paging, virtual scroll, refetch): re-scan on change.
    const observer = new MutationObserver(schedule)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [rootRef, term, enabled])

  React.useEffect(() => {
    const key = keyRef.current
    return () => {
      if (registry.delete(key)) publish()
    }
  }, [])
}
