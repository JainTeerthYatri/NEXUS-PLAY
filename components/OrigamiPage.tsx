"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createOrigami } from "./origami";
import type { OrigamiEngine, OrigamiOptions } from "./origami";

/**
 * components/OrigamiPage.tsx  -- PER-PAGE origami transition (nothing goes in layout.tsx)
 *
 *   <OrigamiPage bg="#060b14" enter="auto" exit="fold" colors={[...]}>...page...</OrigamiPage>
 *
 * exit (what happens when the user leaves THIS page through an internal link):
 *   "fold"    (default) this page folds into a crane; the NEXT page is already visible underneath
 *             and the crane flies away over it
 *   "capture" no animation, but a picture of this page is kept so the next page can unfold on top of it
 *   false     nothing
 * enter (what happens when the user arrives on THIS page):
 *   "never"   (default)
 *   "auto"    a crane flies in over the previous page (if it was an OrigamiPage with exit "fold"/"capture")
 *             and this page unfolds piece by piece. Skipped on a hard load / refresh.
 *   "always"  same, also on hard load
 * opt out for one link: <Link data-no-origami ...>
 */

type Props = {
  children: ReactNode;
  bg?: string;
  paper?: string;
  colors?: OrigamiOptions["colors"];
  speed?: number;
  enter?: "never" | "auto" | "always";
  exit?: "fold" | "capture" | false;
};

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function OrigamiPage({ children, bg, paper, colors, speed, enter = "never", exit = "fold" }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OrigamiEngine | null>(null);

  // build the engine + play the "enter" part (layout effect = covers before the first paint)
  useIsoLayoutEffect(() => {
    const engine = createOrigami({ getRoot: () => rootRef.current, bg, paper, colors, speed });
    engineRef.current = engine;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && (enter === "always" || (enter === "auto" && performance.now() > 4000))) {
      void engine.enter();
    }

    return () => {
      engine.destroy(); // no-op by design: the crane belongs to no single page
      engineRef.current = null;
    };
    // options are read once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // intercept internal link clicks only while THIS page is mounted
  useEffect(() => {
    if (!exit) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if ((a.target && a.target !== "_self") || a.hasAttribute("download") || a.hasAttribute("data-no-origami")) return;
      let url: URL;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      const engine = engineRef.current;
      if (!engine) return;
      if (engine.busy) { e.preventDefault(); e.stopPropagation(); return; }
      if (exit === "capture") { engine.capture(); return; }  // normal navigation continues
      e.preventDefault();
      e.stopPropagation();
      const href = url.pathname + url.search + url.hash;
      void engine.exit(() => router.push(href));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [exit, router]);

  return (
    <div ref={rootRef} style={{ display: "contents" }}>
      {children}
    </div>
  );
}