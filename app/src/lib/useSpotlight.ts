import { useEffect } from "react";

/**
 * Cursor spotlight for the dashboard cards: a soft glow and a lit edge that follow the mouse.
 * Each card gets the pointer position relative to itself (--x, --y) and whether it is close (--on);
 * app.css draws the glow from theme `--accent`. Idea from the 21st.dev spotlight card, done in plain CSS
 * so it also works on cards that are moved with transforms. Does nothing on touch screens or with reduced motion.
 */
export function useSpotlight() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const NEAR = 240;
    let raf = 0;
    let px = 0;
    let py = 0;

    const paint = () => {
      raf = 0;
      document.documentElement.style.setProperty("--xp", (px / window.innerWidth).toFixed(3));
      for (const el of document.querySelectorAll<HTMLElement>(".t")) {
        const r = el.getBoundingClientRect();
        const near = px > r.left - NEAR && px < r.right + NEAR && py > r.top - NEAR && py < r.bottom + NEAR;
        if (near) {
          el.style.setProperty("--x", `${(px - r.left).toFixed(1)}px`);
          el.style.setProperty("--y", `${(py - r.top).toFixed(1)}px`);
        }
        el.style.setProperty("--on", near ? "1" : "0");
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const off = () => {
      for (const el of document.querySelectorAll<HTMLElement>(".t")) el.style.setProperty("--on", "0");
    };

    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", off);
    window.addEventListener("blur", off);
    return () => {
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", off);
      window.removeEventListener("blur", off);
      if (raf) cancelAnimationFrame(raf);
      off();
    };
  }, []);
}
