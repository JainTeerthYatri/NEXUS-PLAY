/**
 * components/origami.ts
 *
 * Origami page transition engine (pure DOM, no dependencies).
 *
 *  EXIT   the current page is snapshotted into 4 paper quadrants, folded in half twice,
 *         squeezed into a diamond, turns into a paper crane and flies away.
 *  ENTER  a crane flies in, lands, and unfolds into the new page (exit played backwards).
 *
 * The page is cloned (cloneNode) for the fold, so nothing in your real React tree is touched.
 */

export type OrigamiOptions = {
  /** element whose children are the page (the provider's wrapper) */
  getRoot: () => HTMLElement | null;
  /** colour behind the paper (use your page background) */
  bg?: string;
  /** colour of the paper's back side */
  paper?: string;
  /** crane facet colours: [dark, mid, light, accent] */
  colors?: [string, string, string, string];
  /** 1 = normal, 1.5 = faster, 0.7 = slower */
  speed?: number;
};

export type OrigamiEngine = {
  readonly busy: boolean;
  /** a transition stage is on screen */
  readonly staged: boolean;
  /** LEAVE: this page folds into a crane OVER the next page (which is already live underneath) */
  exit(onNavigate: () => void): Promise<void>;
  /** remember how this page looks, so the next page can unfold on top of it (no navigation change) */
  capture(): void;
  /** ARRIVE: a crane flies in and this page unfolds over the previous page (or the page colour) */
  enter(): Promise<void>;
  abort(): void;
  destroy(): void;
  /** debug helpers (used for visual tests) */
  _preview(t: number): void;
  _previewClear(): void;
};

const STYLE_ID = "og-style";
const CSS = `
.og-stage{position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483000;overflow:hidden;pointer-events:all;}
.og-abs{position:absolute;left:0;top:0;width:100%;height:100%;}
.og-3d{transform-style:preserve-3d;}
.og-face{position:absolute;left:0;top:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;}
.og-persp{perspective:2400px;perspective-origin:50% 50%;}
.og-crane{position:absolute;pointer-events:none;will-change:transform;filter:drop-shadow(0 14px 18px rgba(0,0,0,.45));}
.og-crane svg{width:100%;height:100%;overflow:visible;display:block;}
.og-wing-a,.og-wing-b{transform-box:view-box;transform-origin:118px 100px;}
.og-wing-a{animation:og-flap-a .46s ease-in-out infinite;}
.og-wing-b{animation:og-flap-b .46s ease-in-out infinite;}
.og-neck{transform-box:view-box;transform-origin:150px 108px;animation:og-neck .92s ease-in-out infinite;}
@keyframes og-flap-a{0%,100%{transform:rotate(24deg)}50%{transform:rotate(-52deg)}}
@keyframes og-flap-b{0%,100%{transform:rotate(14deg)}50%{transform:rotate(-40deg)}}
@keyframes og-neck{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}
`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const raf = () => new Promise<number>((r) => requestAnimationFrame(r));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function mk(cls: string, style: Record<string, string> = {}, parent?: Element): HTMLDivElement {
  const d = document.createElement("div");
  if (cls) d.className = cls;
  for (const k in style) d.style.setProperty(k, style[k]);
  if (parent) parent.appendChild(d);
  return d;
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Paper crane, facing right. viewBox 240 x 200, wing roots at (118,100). */
function craneSVG(c: [string, string, string, string]): string {
  const [dark, mid, light, accent] = c;
  const edge = 'stroke="rgba(255,244,220,.55)" stroke-width="1" stroke-linejoin="round"';
  return `
<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg">
  <g class="og-wing-b">
    <polygon points="114,99 142,100 98,22" fill="${dark}" ${edge}/>
    <polygon points="114,99 98,22 104,70" fill="${mid}" opacity=".9" ${edge}/>
  </g>
  <polygon points="42,70 96,108 90,120" fill="${dark}" ${edge}/>
  <polygon points="42,70 96,108 74,100" fill="${mid}" ${edge}/>
  <polygon points="84,112 120,96 126,142" fill="${mid}" ${edge}/>
  <polygon points="120,96 154,108 126,142" fill="${light}" ${edge}/>
  <polygon points="154,108 140,120 126,142" fill="${dark}" ${edge}/>
  <g class="og-neck">
    <polygon points="146,102 160,116 198,56" fill="${mid}" ${edge}/>
    <polygon points="146,102 198,56 176,92" fill="${light}" ${edge}/>
    <polygon points="198,56 196,70 222,70" fill="${accent}" ${edge}/>
    <polygon points="198,56 222,70 206,62" fill="${dark}" ${edge}/>
  </g>
  <g class="og-wing-a">
    <polygon points="102,101 138,103 64,16" fill="${light}" ${edge}/>
    <polygon points="120,102 138,103 64,16" fill="${mid}" ${edge}/>
    <polygon points="102,101 64,16 90,70" fill="${accent}" opacity=".85" ${edge}/>
  </g>
</svg>`;
}

type Crane = { outer: HTMLDivElement; inner: HTMLDivElement };

function makeCrane(stage: HTMLElement, W: number, H: number, colors: [string, string, string, string]): Crane {
  const S = Math.min(W, H) * 0.40;      // side of the folded square
  const size = S * 2.5;                 // crane drawing width
  const hgt = size * (200 / 240);
  const outer = mk("og-crane", {
    left: `${W / 2 - size / 2}px`,
    top: `${H / 2 - hgt * 0.52}px`,
    width: `${size}px`,
    height: `${hgt}px`,
  }, stage);
  const inner = mk("og-abs", {}, outer);
  inner.innerHTML = craneSVG(colors);
  return { outer, inner };
}

/** a clone of the current page, sized to the viewport and scrolled to where the user is */
function snapshot(root: HTMLElement, W: number, H: number, scrollY: number): { node: HTMLElement; after: () => void } {
  const wrap = mk("", { position: "absolute", left: "0px", top: "0px", width: `${W}px`, height: `${H}px`, overflow: "hidden", "pointer-events": "none" });
  const inner = mk(document.body.className, {});
  const bs = getComputedStyle(document.body);
  const bodyStyle = document.body.getAttribute("style");
  if (bodyStyle) inner.style.cssText = bodyStyle;
  Object.assign(inner.style, {
    position: "absolute",
    left: "0px",
    top: `${-scrollY}px`,
    width: `${document.documentElement.clientWidth}px`,
    minHeight: `${H}px`,
    display: bs.display,
    flexDirection: bs.flexDirection,
    alignItems: bs.alignItems,
    justifyContent: bs.justifyContent,
    fontFamily: bs.fontFamily,
    fontSize: bs.fontSize,
    lineHeight: bs.lineHeight,
    letterSpacing: bs.letterSpacing,
    color: bs.color,
    margin: "0px",
  });
  const bg = bs.backgroundColor;
  if (bg && bg !== "rgba(0, 0, 0, 0)") inner.style.backgroundColor = bg;

  for (const child of Array.from(root.childNodes)) inner.appendChild(child.cloneNode(true));

  // pair every source element with its clone (same order) BEFORE removing anything
  const srcAll = Array.from(root.querySelectorAll("*"));
  const dstAll = Array.from(inner.querySelectorAll("*"));
  const scrolls: { el: HTMLElement; top: number; left: number }[] = [];

  srcAll.forEach((src, i) => {
    const dst = dstAll[i] as HTMLElement | undefined;
    if (!dst) return;
    if (src instanceof HTMLCanvasElement && dst instanceof HTMLCanvasElement) {
      try { dst.width = src.width; dst.height = src.height; dst.getContext("2d")?.drawImage(src, 0, 0); } catch { /* webgl / tainted */ }
    } else if (src instanceof HTMLVideoElement) {
      // a still frame of the video instead of a second player
      const c = document.createElement("canvas");
      c.className = dst.className;
      c.setAttribute("style", dst.getAttribute("style") || "");
      c.style.background = "#000";
      try {
        if (src.readyState >= 2 && src.videoWidth) {
          c.width = src.videoWidth; c.height = src.videoHeight;
          c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
        }
      } catch { /* cross-origin without CORS: leave blank */ }
      dst.replaceWith(c);
    } else if ((src as HTMLElement).scrollTop > 0 || (src as HTMLElement).scrollLeft > 0) {
      scrolls.push({ el: dst, top: (src as HTMLElement).scrollTop, left: (src as HTMLElement).scrollLeft });
    }
  });

  inner.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  inner.querySelectorAll("script, iframe, audio").forEach((n) => n.remove());

  wrap.appendChild(inner);
  return {
    node: wrap,
    // scroll offsets only stick once the clone is attached to the document
    after: () => {
      for (const sc of scrolls) {
        sc.el.style.scrollBehavior = "auto";
        sc.el.scrollTop = sc.top;
        sc.el.scrollLeft = sc.left;
      }
    },
  };
}

/** crane colours taken from the page itself (most common saturated colour), unless the page passes its own */
function deriveColors(root: HTMLElement, fallback: [string, string, string, string]): [string, string, string, string] {
  const votes = new Map<number, number>();
  const els = root.querySelectorAll<HTMLElement>("*");
  const n = Math.min(els.length, 500);
  const parse = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return p.length >= 3 && (p[3] === undefined || p[3] > 0.2) ? p : null; };
  for (let i = 0; i < n; i++) {
    const cs = getComputedStyle(els[i]);
    for (const c of [cs.backgroundColor, cs.borderTopColor, cs.color]) {
      const p = parse(c); if (!p) continue;
      const [r, g, b] = p.map((v) => v / 255);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx < 0.25 || mx - mn < 0.25) continue;                 // skip greys / near-black
      const d = mx - mn;
      let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h = Math.round(((h * 60 + 360) % 360) / 10) * 10;
      votes.set(h, (votes.get(h) || 0) + 1);
    }
  }
  let best = -1, bn = 0;
  votes.forEach((v, h) => { if (v > bn) { bn = v; best = h; } });
  if (best < 0) return fallback;
  return [`hsl(${best} 85% 28%)`, `hsl(${best} 85% 45%)`, `hsl(${best} 90% 66%)`, `hsl(${(best + 150) % 360} 85% 55%)`];
}

/** background colour of the page itself (so the "desk" behind the paper matches each page) */
function detectBg(root: HTMLElement, fallback: string): string {
  let el: Element | null = root.firstElementChild;
  for (let depth = 0; el && depth < 3; depth++) {
    const c = getComputedStyle(el).backgroundColor;
    if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c;
    el = el.firstElementChild;
  }
  const b = getComputedStyle(document.body).backgroundColor;
  return b && b !== "rgba(0, 0, 0, 0)" ? b : fallback;
}

type Fold = {
  TF: number;                       // timeline length in ms (already speed-scaled)
  setT(t: number): void;
  disposePaper(): void;
};

type Ctx = { root: HTMLElement; W: number; H: number; scrollY: number; paper: string; k: number };

function buildFold(stage: HTMLElement, crane: Crane, ctx: Ctx): Fold {
  const { root, W, H, scrollY, paper, k } = ctx;
  const anims: Animation[] = [];
  const D = (ms: number) => ms * k;
  const add = (el: Element, kf: Keyframe[], start: number, dur: number, easing = "linear") => {
    const a = el.animate(kf, { delay: D(start), duration: D(dur), easing, fill: "both" });
    a.pause();
    anims.push(a);
    return a;
  };

  const pw = mk("og-abs og-persp", {}, stage);               // perspective + fade (flat parent of the 3D tree)
  stage.insertBefore(pw, crane.outer);
  const P = mk("og-abs og-3d", { "transform-origin": `${W / 4}px ${H / 4}px` }, pw);
  const tg = mk("og-abs og-3d", {}, P);
  const bz = mk("og-abs og-3d", { transform: "translateZ(10px)" }, P);
  const bfold = mk("og-abs og-3d", { "transform-origin": `50% ${H / 2}px` }, bz);

  const o = 0.6; // overlap so no hairline seams show before folding
  const insets = {
    TL: `inset(0px ${W / 2 - o}px ${H / 2 - o}px 0px)`,
    TR: `inset(0px 0px ${H / 2 - o}px ${W / 2 - o}px)`,
    BL: `inset(${H / 2 - o}px ${W / 2 - o}px 0px 0px)`,
    BR: `inset(${H / 2 - o}px 0px 0px ${W / 2 - o}px)`,
  };
  const back = `linear-gradient(135deg, ${paper} 0%, #ecd9b4 55%, ${paper} 100%)`;
  const pageBg = detectBg(root, "#000");

  const piece = (parent: Element, inset: string, cx: number) => {
    const p = mk("og-abs og-3d", {}, parent);
    const front = mk("og-face", { width: `${W}px`, height: `${H}px`, "clip-path": inset }, p);
    const snap = snapshot(root, W, H, scrollY);
    front.appendChild(snap.node);
    snap.after();
    const shade = mk("og-abs", { background: "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,.8))", opacity: "0", "pointer-events": "none" }, front);
    // back of the sheet = the page itself (printed through the paper), slightly dimmed + paper tint
    const bk = mk("og-face", { width: `${W}px`, height: `${H}px`, "clip-path": inset, transform: "rotateY(180deg)", "transform-origin": `${cx}px 50%`, background: pageBg }, p);
    const snap2 = snapshot(root, W, H, scrollY);
    bk.appendChild(snap2.node);
    snap2.after();
    mk("og-abs", { background: back, opacity: "0.10", "pointer-events": "none" }, bk);
    mk("og-abs", { background: "rgba(0,0,0,.28)", "pointer-events": "none" }, bk);
    return { p, shade };
  };
  const rightFold = (parent: Element) => {
    const rz = mk("og-abs og-3d", { transform: "translateZ(2px)" }, parent);
    return mk("og-abs og-3d", { "transform-origin": `${W / 2}px 50%` }, rz);
  };

  piece(tg, insets.TL, W / 4);
  const rfT = rightFold(tg);
  const TR = piece(rfT, insets.TR, (3 * W) / 4);
  const BL = piece(bfold, insets.BL, W / 4);
  const rfB = rightFold(bfold);
  const BR = piece(rfB, insets.BR, (3 * W) / 4);

  // 1) fold right half over the left
  const ease = "cubic-bezier(.5,.05,.3,1)";
  add(rfT, [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }], 0, 400, ease);
  add(rfB, [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }], 0, 400, ease);
  for (const s of [TR.shade, BR.shade]) add(s, [{ opacity: 0 }, { opacity: 0.7, offset: 0.5 }, { opacity: 0.7 }], 0, 400, "linear");
  // 2) fold the bottom half up
  add(bfold, [{ transform: "rotateX(0deg)" }, { transform: "rotateX(180deg)" }], 400, 400, ease);
  add(BL.shade, [{ opacity: 0 }, { opacity: 0.7, offset: 0.5 }, { opacity: 0.7 }], 400, 400, "linear");
  // 3) squeeze the folded quarter into a diamond
  const sq = Math.min(W, H) * 0.40;
  add(P, [
    { transform: "translate(0px,0px) rotate(0deg) scale(1,1)" },
    { transform: `translate(${W / 4}px,${H / 4}px) rotate(45deg) scale(${sq / (W / 2)},${sq / (H / 2)})` },
  ], 800, 300, "cubic-bezier(.6,0,.3,1)");
  // 4) paper -> crane cross-fade
  add(pw, [{ opacity: 1 }, { opacity: 0 }], 1000, 250, "linear");
  add(crane.inner, [{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "scale(1)" }], 1000, 250, "ease-out");

  const TF = D(1250);
  return {
    TF,
    setT(t: number) { for (const a of anims) a.currentTime = t; },
    disposePaper() {
      for (const a of anims) a.cancel();
      pw.remove();
    },
  };
}

type Pt = { x: number; y: number };
function flightKeyframes(W: number, H: number, mode: "out" | "in"): Keyframe[] {
  let p0: Pt, p1: Pt, p2: Pt;
  if (mode === "out") {
    p0 = { x: 0, y: 0 }; p1 = { x: 0.12 * W, y: -0.10 * H }; p2 = { x: 0.78 * W, y: -0.80 * H };
  } else {
    p0 = { x: -0.72 * W, y: 0.62 * H }; p1 = { x: -0.30 * W, y: 0.02 * H }; p2 = { x: 0, y: 0 };
  }
  const n = 20;
  const kf: Keyframe[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    const x = v * v * p0.x + 2 * v * u * p1.x + u * u * p2.x;
    const y = v * v * p0.y + 2 * v * u * p1.y + u * u * p2.y;
    const dx = 2 * v * (p1.x - p0.x) + 2 * u * (p2.x - p1.x);
    const dy = 2 * v * (p1.y - p0.y) + 2 * u * (p2.y - p1.y);
    const rot = (Math.atan2(dy, dx) * 180) / Math.PI * 0.55;
    const e = u * u * (3 - 2 * u);
    const s = mode === "out" ? 1 - 0.72 * e : 0.28 + 0.72 * e;
    kf.push({ transform: `translate(${x}px,${y}px) rotate(${rot}deg) scale(${s})`, offset: u });
  }
  return kf;
}

// ── shared across pages: the stage must survive the old page unmounting ──────────
let stage: HTMLDivElement | null = null;
let crane: Crane | null = null;
let busy = false;
let locked = false;
let prevOverflow = "";
let dbg: { fold: Fold } | null = null;
let handoff: { node: HTMLElement; after: () => void; bg: string; t: number } | null = null;

export function createOrigami(opts: OrigamiOptions): OrigamiEngine {
  const bg = opts.bg ?? "#0b0610";
  const paper = opts.paper ?? "#f6e7c8";
  const defColors: [string, string, string, string] = ["#c2410c", "#f97316", "#fbbf24", "#e11d48"];
  const pickColors = (root: HTMLElement | null) => opts.colors ?? (root ? deriveColors(root, defColors) : defColors);
  const k = 1 / (opts.speed ?? 0.85);

  const size = () => ({ W: document.documentElement.clientWidth, H: window.innerHeight });
  const lock = () => { if (locked) return; locked = true; prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden"; };
  const unlock = () => { if (!locked) return; locked = false; document.documentElement.style.overflow = prevOverflow; };

  const drive = (fold: Fold, from: number, to: number) =>
    new Promise<void>((resolve) => {
      const t0 = performance.now();
      const dir = to > from ? 1 : -1;
      const dur = Math.abs(to - from);
      const step = (now: number) => {
        const e = Math.min(dur, now - t0);
        fold.setT(from + dir * e);
        if (e >= dur) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

  const fly = async (c: Crane, W: number, H: number, mode: "out" | "in") => {
    c.outer.getAnimations().forEach((a) => a.cancel());
    const a = c.outer.animate(flightKeyframes(W, H, mode), {
      duration: 1700 * k,
      easing: mode === "out" ? "cubic-bezier(.5,0,.9,.6)" : "cubic-bezier(.15,.55,.3,1)",
      fill: "forwards",
    });
    await a.finished.catch(() => undefined);
  };

  const cleanup = () => {
    dbg = null;
    stage?.remove();
    stage = null;
    crane = null;
    busy = false;
    unlock();
  };

  const engine: OrigamiEngine = {
    get busy() { return busy; },
    get staged() { return !!stage; },

    capture() {
      const root = opts.getRoot();
      if (!root || busy) return;
      const { W, H } = size();
      const snap = snapshot(root, W, H, window.scrollY);
      root.querySelectorAll("video").forEach((v) => (v as HTMLVideoElement).pause());
      handoff = { node: snap.node, after: snap.after, bg: detectBg(root, bg), t: performance.now() };
    },

    exit(onNavigate) {
      const root = opts.getRoot();
      if (busy || !root) { onNavigate(); return Promise.resolve(); }
      busy = true;
      ensureStyle();
      const { W, H } = size();
      const scrollY = window.scrollY;
      lock();
      root.querySelectorAll("video").forEach((v) => (v as HTMLVideoElement).pause());
      // transparent stage: the NEXT page shows through wherever the paper has folded away
      stage = mk("og-stage", { transition: "opacity 400ms ease" });
      document.body.appendChild(stage);
      const c = makeCrane(stage, W, H, pickColors(root));
      crane = c;
      const fold = buildFold(stage, c, { root, W, H, scrollY, paper, k });
      fold.setT(0);                                       // identical to the live page: no visible jump

      return (async () => {
        await raf();
        onNavigate();
        // wait until the old page has left the DOM and the next one is painted
        const t0 = performance.now();
        while (root.isConnected && performance.now() - t0 < 2500) await sleep(30);
        await sleep(200);
        await drive(fold, 0, fold.TF);
        fold.disposePaper();
        await sleep(350);                                 // crane hovers over the new page
        await fly(c, W, H, "out");
        cleanup();
      })();
    },

    async enter() {
      const root = opts.getRoot();
      if (!root || busy) return;
      busy = true;
      ensureStyle();
      const { W, H } = size();
      lock();
      const h = handoff && performance.now() - handoff.t < 5000 ? handoff : null;
      handoff = null;
      stage = mk("og-stage", { background: h ? h.bg : detectBg(root, bg), transition: "opacity 400ms ease" });
      if (h) { stage.appendChild(h.node); h.after(); }    // the previous page stays visible underneath
      document.body.appendChild(stage);
      const c = makeCrane(stage, W, H, pickColors(root));
      crane = c;
      const flight = fly(c, W, H, "in");                  // starts in the same tick: no flash
      await flight;
      await sleep(450);
      try { await (document as any).fonts?.ready; } catch { /* ignore */ }
      if (!stage || crane !== c) return;
      c.outer.getAnimations().forEach((a) => a.cancel()); // rest at the centre
      const fold = buildFold(stage, c, { root, W, H, scrollY: window.scrollY, paper, k });
      fold.setT(fold.TF);
      await raf();
      await drive(fold, fold.TF, 0);                      // unfold, quarter by quarter
      fold.disposePaper();
      cleanup();
    },

    abort() {
      if (!stage) { cleanup(); return; }
      const s = stage;
      s.style.opacity = "0";
      window.setTimeout(() => { if (stage === s) cleanup(); }, 420);
    },
    // the stage belongs to no single page: unmounting must not tear it down
    destroy() { /* intentionally empty */ },

    _preview(t) {
      const root = opts.getRoot();
      if (!root) return;
      if (!dbg) {
        ensureStyle();
        const { W, H } = size();
        stage = mk("og-stage", { background: detectBg(root, bg) });
        document.body.appendChild(stage);
        crane = makeCrane(stage, W, H, pickColors(root));
        dbg = { fold: buildFold(stage, crane, { root, W, H, scrollY: window.scrollY, paper, k }) };
      }
      dbg.fold.setT(t * k);
    },
    _previewClear() { cleanup(); },
  };
  return engine;
}

export { clamp01 };