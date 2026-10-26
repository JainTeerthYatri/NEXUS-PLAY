"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createOrigami } from "./origami";
import type { OrigamiEngine, OrigamiOptions } from "./origami";

/**
 * components/OrigamiPage.tsx  -- PER-PAGE origami transition (nothing goes in layout.tsx)
 *
 *   export default function ClipsPage() {
 *     ...
 *     return (
 *       <OrigamiPage bg="#060b14" colors={["#0e7490", "#06b6d4", "#67e8f9", "#f43f5e"]}>
 *         ...your page...
 *       </OrigamiPage>
 *     );
 *   }
 *
 * - leaving this page through an internal <Link>/<a>: page folds -> crane flies out
 * - arriving on this page from another <OrigamiPage>: crane flies in -> unfolds into the page
 * - every page picks its own colours / speed (or later its own transition)
 *
 * enter:
 *   "auto"   (default) play only when arriving from another OrigamiPage or by an in-app navigation
 *   "always" also play on a hard load / refresh
 *   "never"  no enter animation (exit only)
 * exit: false = this page never plays the leaving animation
 * opt out for one link: <Link data-no-origami ...>
 */

type Props = {
  children: ReactNode;
  bg?: string;
  paper?: string;
  colors?: OrigamiOptions["colors"];
  speed?: number;
  enter?: "auto" | "always" | "never";
  exit?: boolean;
};

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function OrigamiPage({ children, bg, paper, colors, speed, enter = "auto", exit = true }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<OrigamiEngine | null>(null);

  // build the engine + play the "enter" part (layout effect = covers before the first paint)
  useIsoLayoutEffect(() => {
    const engine = createOrigami({ getRoot: () => rootRef.current, bg, paper, colors, speed });
    engineRef.current = engine;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      if (engine.staged) engine.abort();
    } else if (enter !== "never") {
      const softNav = performance.now() > 4000; // not a fresh page load -> came here by in-app navigation
      if (engine.staged || enter === "always" || (enter === "auto" && softNav)) {
        void engine.enter();
      }
    } else if (engine.staged) {
      engine.abort();
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
      e.preventDefault();
      e.stopPropagation();
      if (engine.busy) return;
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