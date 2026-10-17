import { useEffect, useRef, useState } from 'react'

/**
 * useTextAutoFit hook: dynamically scales down font-size so text never clips
 * or overflows its parent box (Fulfills Phase 2 V24 requirement #9-11).
 */
export function useTextAutoFit(text: string, initialFontSize = 24, minFontSize = 10) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [fontSize, setFontSize] = useState<number>(initialFontSize)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !text) return

    let currentSize = initialFontSize
    el.style.fontSize = `${currentSize}px`

    // Reduce font-size while content overflows container width or height
    while (
      (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) &&
      currentSize > minFontSize
    ) {
      currentSize -= 1
      el.style.fontSize = `${currentSize}px`
    }

    setFontSize(currentSize)
  }, [text, initialFontSize, minFontSize])

  return { containerRef, fontSize }
}
