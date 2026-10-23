"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { GiftScene } from "@/components/giftScene";
import {
  Radio, Users, Video, Sparkles, MessageSquare, Shield, ArrowRight, Zap,
  Award, Wifi, WifiOff, Pencil, Gift,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────────
   ONE PAGE, NO SEPARATE LOADS

   Logged-out visitors see the 3D gift box on top of THIS SAME page.
   1. Tap the box 3x (hop / wobble / squash physics)
   2. Box opens -> bow unties, ribbon unwraps, lid flies off
   3. Navbar, boxes, cards, footer fly out of the box into place (no text yet)
   4. The page's REAL words (and emojis) fly out of the box like seeds, scattered
   5. Box shrinks away, words spiral into a vortex and orbit as a 3D globe
   6. Every word flies from the globe to its exact spot on the page

   Logged-in users skip the gift and land straight on their welcome page.
   Words are read straight from the DOM, so any text you add later animates too.
──────────────────────────────────────────────────────────────────────────── */

/* ───────────────────────── CONFIG ───────────────────────── */

// "session" = gift plays once per browser tab session, "always" = every visit while logged out.
const GIFT_MODE: "session" | "always" = "session";
const GIFT_KEY = "astroid-gift-seen";

const XP_PER_LEVEL = 500;
const HI_FONT = "'Noto Serif Devanagari','Kohinoor Devanagari','Mangal','Nirmala UI',serif";

const RANKS = [
  { en: "Bronze Operator", hi: "कांस्य" },
  { en: "Silver Operator", hi: "रजत" },
  { en: "Gold Operator", hi: "स्वर्ण" },
  { en: "Platinum Operator", hi: "प्लैटिनम" },
  { en: "Diamond Operator", hi: "हीरक" },
  { en: "Legend Operator", hi: "महारथी" },
];

const HIGHLIGHTS = [
  { icon: Radio, title: "Go live from your browser", hi: "सीधा प्रसारण", text: "Broadcast with a built-in studio — layers, facecam and direct streaming." },
  { icon: Users, title: "Find your squad", hi: "अपनी टोली", text: "Join lobbies by region and skill, or host one and pick your own team." },
  { icon: Award, title: "Level up as you play", hi: "आगे बढ़ो", text: "Post clips, chat and stream to earn XP and climb the ranks." },
];

const MODULES = [
  { hi: "प्रसारण", title: "Universal Web-OBS Studio", description: "Browser-native live broadcasting compositor with multi-layer canvas, facecam PiP, and direct RTMP streaming bridge.", href: "/studio", icon: Radio },
  { hi: "रचना", title: "AI Thumbnail & Logo Forge", description: "Zero-cost neural text-to-image engine with real-time progress steps and 2D canvas sticker overlay editors.", href: "/dashboard", icon: Sparkles },
  { hi: "संवाद", title: "Unrestricted Global Comms", description: "Real-time open chat rooms with instant moderation and Web Crypto API end-to-end encrypted direct messaging.", href: "/chat", icon: MessageSquare },
  { hi: "साथी", title: "Neural LFG Matchmaker", description: "Automated regional skill filters, slot-locked party lobbies, and live squad host controls.", href: "/lfg", icon: Users },
  { hi: "झलक", title: "Highlight Clips Vault", description: "Scroll-snap vertical shorts video feed with strict 2MB validation and automatic XP leveling rewards.", href: "/clips", icon: Video },
  { hi: "सुरक्षा", title: "5-Tier RBAC Command Center", description: "Comprehensive moderation dashboard with audit logs, ban enforcement, and DPDP Act compliance desks.", href: "/mod", icon: Shield },
];

/* ───────────────────────── helpers ───────────────────────── */

interface Profile {
  id: string;
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  bio?: string | null;
  xp?: number | null;
  total_xp?: number | null;
  is_live?: boolean | null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function greetingFor(hour: number) {
  if (hour < 5) return { hi: "शुभ रात्रि", en: "Good night" };
  if (hour < 12) return { hi: "सुप्रभात", en: "Good morning" };
  if (hour < 18) return { hi: "नमस्ते", en: "Good afternoon" };
  return { hi: "शुभ संध्या", en: "Good evening" };
}

/** Round saffron seal (like a tilak / bindi) with a letter */
function Seal({ char, size = "md" }: { char: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "w-16 h-16 text-3xl" : size === "sm" ? "w-8 h-8 text-base" : "w-11 h-11 text-xl";
  return (
    <span
      className={`inline-flex items-center justify-center ${dims} rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-amber-50 font-black shadow-[0_0_18px_rgba(249,115,22,0.6)] border-2 border-double border-amber-200/80 select-none`}
      style={{ fontFamily: HI_FONT }}
    >
      {char}
    </span>
  );
}

/** Mughal-style arch (decorative) */
function ArchGate({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M14 160 V84 C14 52 58 42 100 4 C142 42 186 52 186 84 V160 Z M42 160 V90 C42 70 74 62 100 32 C126 62 158 70 158 90 V160 Z"
      />
      <circle cx="100" cy="14" r="4" fill="currentColor" />
    </svg>
  );
}

type Word = {
  el: HTMLSpanElement;
  w: number; h: number;
  tx: number; ty: number;          // final slot (viewport centre)
  sx: number; sy: number;          // scatter landing
  arc: number; sr: number; curve: number; swirl: number; ph: number;
  d1: number; d2: number; d3: number;
  v0: number; v1: number; v2: number; // point on unit sphere
  gk: number;                      // globe shrink factor (big words get smaller on the globe)
  done: boolean;
};

/* ───────────────────────── page ───────────────────────── */

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const rainRef = useRef<HTMLCanvasElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const wordLayerRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GiftScene | null>(null);
  const timers = useRef<number[]>([]);
  const wordRaf = useRef(0);
  const clicksRef = useRef(0);
  const endedRef = useRef(false);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [introOn, setIntroOn] = useState(false);          // overlay mounted
  const [stage, setStage] = useState<"idle" | "running" | "done">("done");
  const [clicks, setClicks] = useState(0);
  const [boxGone, setBoxGone] = useState(false);
  const [bgFaded, setBgFaded] = useState(false);
  const [ending, setEnding] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /* ───── auth first: decides whether the gift is shown (guests only) ───── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session?.user) {
          let seen = false;
          try { seen = GIFT_MODE === "session" && sessionStorage.getItem(GIFT_KEY) === "true"; } catch { /* ignore */ }
          if (!seen) { setStage("idle"); setIntroOn(true); }
          return;
        }

        setUser(session.user);
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        if (data && !cancelled) setProfile(data as Profile);
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  /* ───── Devanagari rain background ───── */
  useEffect(() => {
    if (!authReady) return;
    const canvas = rainRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const setDims = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    setDims();

    const letters = "अआइईउऊएऐओऔकखगघचछजझटठडढतथदधनपफबभमयरलवशषसह०१२३४५६७८९";
    const fontSize = 18;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array.from({ length: columns }).fill(1) as number[];

    const onResize = () => {
      setDims();
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }).fill(1) as number[];
    };
    window.addEventListener("resize", onResize);

    const draw = () => {
      ctx.fillStyle = "rgba(11, 6, 16, 0.13)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "Noto Sans Devanagari","Nirmala UI","Mangal",sans-serif`;
      for (let i = 0; i < drops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
        ctx.fillStyle = i % 9 === 0 ? "#fbbf24" : i % 13 === 0 ? "#4ade80" : "#f97316";
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      frame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, [authReady]);

  /* ───── finish: reveal the real page, fade the overlay away ───── */
  const endIntro = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    cancelAnimationFrame(wordRaf.current);
    rootRef.current?.setAttribute("data-intro", "done"); // real text + layout visible instantly
    try { if (GIFT_MODE === "session") sessionStorage.setItem(GIFT_KEY, "true"); } catch { /* ignore */ }
    document.body.style.overflow = "";
    setEnding(true);          // overlay (and the flying clones) cross-fade into the real text
    setStage("done");
    later(() => setIntroOn(false), 750);
  };

  /* ───── 3D scene (loaded lazily, guests only) ───── */
  useEffect(() => {
    if (!authReady || !introOn) return;
    const host = canvasHostRef.current;
    if (!host) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      endIntro();
      return;
    }

    let cancelled = false;
    let gs: GiftScene | null = null;
    const onResize = () => gs?.resize();

    (async () => {
      try {
        const { createGiftScene } = await import("@/components/giftScene");
        if (cancelled) return;
        gs = createGiftScene(host, () => setBoxGone(true));
        sceneRef.current = gs;
      } catch (err) {
        console.error("WebGL init failed, skipping gift intro", err);
        if (!cancelled) endIntro();
      }
    })();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      gs?.dispose();
      sceneRef.current = null;
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      cancelAnimationFrame(wordRaf.current);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, introOn]);

  /* ───── STEP 3: navbar / boxes / cards / footer fly out of the box (no text yet) ───── */
  const flyLayout = (): number => {
    const root = rootRef.current;
    if (!root) return 0;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-fly], .nav-slot > *"));
    const vcx = window.innerWidth / 2;
    const vcy = window.innerHeight * 0.42;
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const dx = vcx - (r.left + r.width / 2);
      const dy = vcy - (r.top + r.height / 2);
      el.classList.add("fly-on");
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.04) rotate(${(i % 2 ? 1 : -1) * (25 + i * 6)}deg)`, opacity: 0 },
          { transform: "translate(0px, 0px) scale(1) rotate(0deg)", opacity: 1 },
        ],
        { duration: 1200, delay: Math.min(i, 9) * 110, easing: "cubic-bezier(0.34, 1.35, 0.64, 1)", fill: "backwards" }
      );
    });
    return 1200 + Math.min(Math.max(els.length - 1, 0), 9) * 110 + 250;
  };

  /* ───── STEPS 4-6: the page's real words -> seeds -> vortex globe -> settle ───── */
  const startWords = () => {
    const root = rootRef.current;
    const scope = root?.querySelector<HTMLElement>(".page-content");
    const layer = wordLayerRef.current;
    const core = coreRef.current;
    if (!root || !scope || !layer) { endIntro(); return; }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw / 2;
    const cy = vh / 2;
    const ox0 = cx;
    const oy0 = vh * 0.42; // box mouth on screen

    // collect every visible word on the page (measured, not mutated, so React is untouched)
    const raw: { el: HTMLSpanElement; r: DOMRect; fs: number }[] = [];
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const p = n.parentElement;
        if (!p || !n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const range = document.createRange();
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue as string;
      const parent = node.parentElement as HTMLElement;
      const cs = getComputedStyle(parent);
      if (cs.display === "none" || cs.visibility === "hidden") continue;

      let color = cs.color;
      if (color === "transparent" || /,\s*0\)$/.test(color)) color = "#fbbf24"; // gradient / clipped text
      const fs = parseFloat(cs.fontSize) || 16;

      const re = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const r = range.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.bottom < -20 || r.top > vh + 20 || r.right < -20 || r.left > vw + 20) continue; // below the fold: revealed at the end

        const el = document.createElement("span");
        el.textContent = m[0];
        Object.assign(el.style, {
          position: "absolute", left: "0px", top: "0px",
          width: `${r.width}px`, height: `${r.height}px`,
          lineHeight: `${r.height}px`, textAlign: "center", whiteSpace: "nowrap",
          fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontStyle: cs.fontStyle,
          letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, color,
          textShadow: "0 0 12px rgba(249,115,22,0.7)",
          willChange: "transform, opacity", opacity: "0",
        } as Partial<CSSStyleDeclaration>);
        layer.appendChild(el);
        raw.push({ el, r: r as DOMRect, fs });
      }
    }

    const n = raw.length;
    if (n === 0) { endIntro(); return; }
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);

    const words: Word[] = raw.map(({ el, r, fs }, i) => {
      const idx = order[i];
      const y = 1 - (2 * (idx + 0.5)) / n;
      const rr = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = idx * 2.399963229728653;
      return {
        el, w: r.width, h: r.height,
        tx: r.left + r.width / 2, ty: r.top + r.height / 2,
        sx: vw * (0.05 + 0.9 * Math.random()), sy: vh * (0.08 + 0.84 * Math.random()),
        arc: 80 + Math.random() * 180, sr: (Math.random() - 0.5) * 120,
        curve: (Math.random() - 0.5) * 160, swirl: Math.PI * 2 * (1 + Math.random() * 0.4),
        ph: Math.random() * 6.28,
        d1: Math.random() * 550, d2: Math.random() * 650, d3: Math.random() * 950,
        v0: Math.cos(phi) * rr, v1: y, v2: Math.sin(phi) * rr,
        gk: Math.min(1, Math.max(0.45, 22 / fs)),
        done: false,
      };
    });

    // ---- timing (ms from the moment words start) ----
    const GATHER = 2000;  // vortex starts pulling words in
    const SETTLE = 6800;  // words leave the globe and fly to their spots
    const R = Math.min(vw, vh) * 0.36;
    const F = R * 3.4;
    const t0 = performance.now();
    let boxExited = false;

    const step = (now: number) => {
      const t = now - t0;

      if (!boxExited && t > 900) {
        boxExited = true;
        sceneRef.current?.exit(); // box shrinks away once the seeds are sown
      }

      const u = Math.max(0, (t - GATHER) / 1000);
      const yaw = 0.35 * u + 0.18 * u * u;               // globe spins faster and faster
      const pitch = 0.42 + 0.22 * Math.sin(u * 0.8);
      const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
      const cp = Math.cos(pitch), sp = Math.sin(pitch);

      let alive = 0;
      for (const wd of words) {
        if (wd.done) continue;

        // current point on the rotating 3D globe
        const x1 = wd.v0 * cyaw + wd.v2 * syaw;
        const z1 = -wd.v0 * syaw + wd.v2 * cyaw;
        const y1 = wd.v1 * cp - z1 * sp;
        const z2 = wd.v1 * sp + z1 * cp;
        const persp = F / (F - z2 * R);
        const ox = cx + x1 * R * persp;
        const oy = cy + y1 * R * persp;
        const os = persp * 0.85 * wd.gk;
        const oo = 0.3 + 0.7 * ((z2 + 1) / 2);

        // A: seeds flung out of the box
        const p1 = clamp01((t - wd.d1) / 1100);
        const e1 = easeOutCubic(p1);
        let x = lerp(ox0, wd.sx, e1);
        let y = lerp(oy0, wd.sy, e1) - Math.sin(Math.PI * e1) * wd.arc;
        if (p1 >= 1) {
          x += Math.sin(t * 0.0013 + wd.ph) * 4;
          y += Math.cos(t * 0.0011 + wd.ph) * 4;
        }
        let rot = wd.sr * e1;
        let sc = 0.15 + 0.85 * e1;
        let op = clamp01(p1 * 5);
        let z = 0;

        // B: black-hole spiral into the globe
        const p2 = clamp01((t - GATHER - wd.d2) / 1500);
        if (p2 > 0) {
          const e2 = easeInOutCubic(p2);
          const ang = e2 * wd.swirl;
          const rx = x - cx, ry = y - cy;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          x = cx + lerp(rx * ca - ry * sa, ox - cx, e2);
          y = cy + lerp(rx * sa + ry * ca, oy - cy, e2);
          rot = lerp(rot, 0, e2);
          sc = lerp(sc, os, e2);
          op = lerp(op, oo, e2);
          z = Math.round((z2 + 1) * 100) * e2;
        }

        // C: leave the globe, curve into the exact spot on the page
        const p3 = clamp01((t - SETTLE - wd.d3) / 1400);
        if (p3 > 0) {
          const e3 = easeInOutCubic(p3);
          const dx = wd.tx - ox, dy = wd.ty - oy;
          const len = Math.hypot(dx, dy) || 1;
          const bend = Math.sin(Math.PI * e3) * wd.curve;
          x = lerp(ox, wd.tx, e3) + (-dy / len) * bend;
          y = lerp(oy, wd.ty, e3) + (dx / len) * bend;
          sc = lerp(os, 1, e3);
          op = lerp(oo, 1, e3);
          rot = 0;
        }

        wd.el.style.transform = `translate3d(${x - wd.w / 2}px, ${y - wd.h / 2}px, 0) rotate(${rot}deg) scale(${sc})`;
        wd.el.style.opacity = String(op);
        wd.el.style.zIndex = String(z);

        if (p3 >= 1) {
          wd.done = true; // parked exactly on its real spot until everyone has arrived
          wd.el.style.transform = `translate3d(${wd.tx - wd.w / 2}px, ${wd.ty - wd.h / 2}px, 0) rotate(0deg) scale(1)`;
          wd.el.style.opacity = "1";
          wd.el.style.zIndex = "0";
        } else {
          alive++;
        }
      }

      // glowing singularity in the middle of the globe
      if (core) {
        const c = clamp01((t - GATHER) / 1500) * (1 - clamp01((t - (SETTLE + 300)) / 1200));
        core.style.opacity = String(c * 0.9);
        core.style.transform = `translate(-50%, -50%) scale(${0.6 + 1.2 * c})`;
      }

      if (alive > 0) wordRaf.current = requestAnimationFrame(step);
      else {
        if (core) core.style.opacity = "0";
        endIntro(); // real text appears under the parked clones, overlay cross-fades away
      }
    };
    wordRaf.current = requestAnimationFrame(step);
  };

  /* ───── master sequence, runs after the 3rd tap ───── */
  const runSequence = () => {
    const gs = sceneRef.current;
    if (!gs) return;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    setStage("running");
    later(() => { gs.open(); setBgFaded(true); }, 1000);          // after the big final shake
    later(() => { const dur = flyLayout(); later(startWords, dur); }, 1000 + 1500); // as the lid lifts off
  };

  const skip = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    endIntro();
  };

  /* ───── input ───── */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const gs = sceneRef.current;
    if (!gs || clicksRef.current >= 3) return;
    if (!gs.pick(e.clientX, e.clientY)) return;
    clicksRef.current += 1;
    const n = clicksRef.current;
    setClicks(n);
    gs.kick(n);
    if (n === 3) runSequence();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const gs = sceneRef.current;
    if (!gs) return;
    e.currentTarget.style.cursor = clicksRef.current < 3 && gs.pick(e.clientX, e.clientY) ? "pointer" : "default";
  };

  const hintText =
    clicks === 0 ? "TAP THE GIFT BOX 3 TIMES TO OPEN IT" : clicks === 1 ? "IT MOVED! KEEP GOING..." : "ONE MORE TAP...";

  /* ───── decorations (deterministic: no hydration mismatch) ───── */
  const petals = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: (i * 1.7) % 12,
        duration: 12 + ((i * 5) % 9),
        size: 9 + ((i * 3) % 10),
      })),
    []
  );

  /* ───── derived profile values ───── */
  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Player";
  const handle = profile?.username || user?.email?.split("@")[0] || "player";
  const role = (profile?.role || "member").toUpperCase();
  const totalXp = profile?.total_xp ?? profile?.xp ?? 0;
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpInto = totalXp % XP_PER_LEVEL;
  const rank = RANKS[Math.min(level - 1, RANKS.length - 1)];
  const isLive = !!profile?.is_live;
  const greet = greetingFor(new Date().getHours());

  if (!authReady) {
    return <div className="fixed inset-0 bg-[#0b0610]" />;
  }

  return (
    <div
      ref={rootRef}
      data-intro={stage === "done" ? "done" : "pending"}
      className="min-h-screen bg-[#0b0610] text-slate-100 flex flex-col relative overflow-x-hidden"
    >
      {/* tricolour strip */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none"
        style={{ background: "linear-gradient(90deg,#ff9933 0 33.3%,#ffffff 33.3% 66.6%,#138808 66.6% 100%)" }}
      />

      {/* background: Devanagari rain, jaali pattern, glow, petals, frame, watermarks */}
      <canvas ref={rainRef} className="fixed inset-0 w-full h-full pointer-events-none opacity-25 z-0" />
      <div className="jaali fixed inset-0 pointer-events-none z-0 opacity-[0.07]" />
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(249,115,22,0.24), transparent 70%)" }}
      />
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        {petals.map((p, i) => (
          <span
            key={i}
            className="petal"
            style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.3, animationDelay: `-${p.delay}s`, animationDuration: `${p.duration}s` }}
          />
        ))}
      </div>
      <div className="absolute inset-4 sm:inset-8 pointer-events-none z-[1] border border-amber-300/15 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-orange-500 to-transparent shadow-[0_0_15px_#f97316]" />
        <div className="absolute top-0 left-0 w-1 h-32 bg-gradient-to-b from-orange-500 to-transparent shadow-[0_0_15px_#f97316]" />
        <div className="absolute bottom-0 right-0 w-32 h-1 bg-gradient-to-l from-emerald-500 to-transparent shadow-[0_0_15px_#10b981]" />
        <div className="absolute bottom-0 right-0 w-1 h-32 bg-gradient-to-t from-emerald-500 to-transparent shadow-[0_0_15px_#10b981]" />
      </div>
      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none select-none z-[1] text-orange-500/20 font-black text-4xl tracking-[0.3em]"
        style={{ writingMode: "vertical-rl", textOrientation: "sideways", fontFamily: HI_FONT }}
      >
        गेमिंग क्लाउड
      </div>
      <div
        className="fixed right-4 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none select-none z-[1] text-amber-300/20 font-black text-2xl tracking-[0.4em]"
        style={{ writingMode: "vertical-rl", textOrientation: "sideways", fontFamily: HI_FONT }}
      >
        क्षुद्रग्रह · ASTEROID
      </div>

      {/* ═════════════ THE PAGE (everything inside flies out of the gift box) ═════════════ */}
      <div className="page-content relative z-10 flex flex-col flex-1">
        <div className="nav-slot">
          <Navbar />
        </div>

        <main className="flex-1 flex flex-col items-stretch px-4 sm:px-6 lg:px-8 py-14 w-full max-w-7xl mx-auto space-y-14">
          {user ? (
            /* ───────────── LOGGED IN: personal welcome ───────────── */
            <div className="space-y-8">
              <header data-fly className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 border-b border-amber-300/15">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-orange-500/40 bg-orange-500/10 text-orange-300 font-mono text-xs tracking-wider">
                    <span style={{ fontFamily: HI_FONT }}>रचनाकार केंद्र</span>
                    <span className="text-amber-300/70">//</span>
                    <span>CREATOR_HUB</span>
                    <span className="text-amber-300/70">//</span>
                    <span>@{handle.toUpperCase()}</span>
                  </div>

                  <p className="text-sm text-amber-300/90 tracking-widest">
                    <span style={{ fontFamily: HI_FONT }}>{greet.hi}</span> <span className="text-slate-500">·</span> <span className="font-mono">{greet.en}</span>
                  </p>

                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span>Welcome back,</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-200 uppercase">
                      {displayName}
                    </span>
                    <Seal char="अ" size="sm" />
                  </h1>

                  <p className="text-slate-300 max-w-2xl">
                    Your control center is online. <span className="text-amber-300 font-semibold">Start your work</span> — go live, squad up or drop a fresh clip.
                  </p>
                  <p className="text-sm text-slate-400" style={{ fontFamily: HI_FONT }}>
                    स्वागत है, {displayName} जी — अपना काम शुरू करें।
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md border font-mono text-xs font-bold tracking-wider ${
                      isLive ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300" : "border-slate-600/60 bg-white/5 text-slate-400"
                    }`}
                  >
                    {isLive ? <Wifi className="w-4 h-4 animate-pulse" /> : <WifiOff className="w-4 h-4" />}
                    {isLive ? "LIVE" : "OFFLINE"}
                  </span>
                  <Link
                    href="/studio"
                    className="group inline-flex items-center gap-2 px-6 py-3 rounded-md bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold text-sm shadow-[0_0_28px_rgba(249,115,22,0.5)] hover:shadow-[0_0_40px_rgba(249,115,22,0.8)] hover:scale-105 transition-all active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    Launch Studio
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </header>

              {/* profile */}
              <section data-fly className="in-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative shrink-0">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="w-20 h-20 rounded-lg object-cover border-2 border-amber-300/40 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                    />
                  ) : (
                    <Seal char={displayName.charAt(0).toUpperCase()} size="lg" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black uppercase tracking-tight truncate">{displayName}</h2>
                    <span className="px-2 py-0.5 rounded border border-amber-300/50 bg-amber-300/10 text-amber-300 font-mono text-[11px] font-bold tracking-wider">
                      {role}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-orange-300 font-bold">@{handle.toUpperCase()}</span>
                    <span># UID: {user.id.slice(0, 13)}…</span>
                  </p>
                  <p className="text-sm text-slate-300">
                    {profile?.bio || "No telemetry bio initialized yet. Update your profile parameters to broadcast details."}
                  </p>
                </div>

                <Link
                  href="/settings"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-amber-300/30 bg-white/[0.03] text-slate-200 text-sm font-medium hover:border-orange-500/60 hover:text-orange-300 hover:bg-orange-500/10 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Profile
                </Link>
              </section>

              {/* level */}
              <section data-fly className="in-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 font-bold tracking-wide">
                    <Award className="w-5 h-5 text-amber-300" />
                    <span className="uppercase">Level {level}</span>
                    <span className="text-slate-500">—</span>
                    <span className="text-amber-300 uppercase">{rank.en}</span>
                    <span className="text-orange-400 font-black text-lg" style={{ fontFamily: HI_FONT }}>{rank.hi}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {xpInto} / {XP_PER_LEVEL} XP (Total: {totalXp} XP)
                  </span>
                </div>
                <div className="h-3 rounded-full bg-black/60 border border-amber-300/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-600 via-amber-400 to-yellow-200 shadow-[0_0_14px_rgba(249,115,22,0.7)]"
                    style={{ width: `${Math.max(2, (xpInto / XP_PER_LEVEL) * 100)}%` }}
                  />
                </div>
              </section>
            </div>
          ) : (
            /* ───────────── GUEST: welcome hero ───────────── */
            <section data-fly className="relative text-center space-y-7 max-w-4xl mx-auto pt-6">
              <ArchGate className="absolute left-1/2 -translate-x-1/2 -top-8 w-72 h-56 text-orange-500/10 pointer-events-none" />
              <div className="relative flex justify-center"><Seal char="अ" size="lg" /></div>
              <p className="relative text-xs tracking-[0.35em] text-amber-300/80">
                <span style={{ fontFamily: HI_FONT }}>गेमिंग क्लाउड</span> <span className="font-mono">// GAMING CLOUD</span>
              </p>
              <h1 className="relative text-5xl sm:text-7xl font-black tracking-tight uppercase">
                ASTEROID{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-200">GAMING CLOUD</span>
              </h1>
              <p className="relative text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Stream, chat, clip and squad up — six modules, one cloud. Log in to open your personal control center.
              </p>
              <p className="relative text-sm text-slate-400" style={{ fontFamily: HI_FONT }}>
                आपका स्वागत है — लॉग इन करें और अपना काम शुरू करें।
              </p>
              <div className="relative flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-md bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold shadow-[0_0_30px_rgba(249,115,22,0.55)] hover:scale-105 transition-all active:scale-95"
                >
                  <Zap className="w-4 h-4" /> Enter the Cloud
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-md border border-amber-300/50 text-amber-300 font-bold hover:bg-amber-300/10 hover:scale-105 transition-all active:scale-95"
                >
                  Log in
                </Link>
              </div>
            </section>
          )}

          {/* ───────────── WELCOME INFO (for everyone) ───────────── */}
          <section data-fly className="in-card p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.3em] text-amber-300/80 uppercase">
                About <span className="text-slate-500">·</span> <span style={{ fontFamily: HI_FONT }}>परिचय</span>
              </p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome to Asteroid Gaming Cloud</h2>
              <p className="text-slate-300 max-w-3xl leading-relaxed">
                One home for everything a gamer-creator needs: stream live from your browser, find a squad, share your best highlights and chat with the community.
              </p>
              <p className="text-sm text-slate-400" style={{ fontFamily: HI_FONT }}>
                यहाँ आप लाइव स्ट्रीम कर सकते हैं, टोली बना सकते हैं, अपनी झलकियाँ साझा कर सकते हैं और समुदाय से बात कर सकते हैं।
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {HIGHLIGHTS.map(({ icon: Icon, title, hi, text }) => (
                <div key={title} className="flex gap-4 p-4 rounded-lg border border-amber-300/15 bg-white/[0.02]">
                  <div className="shrink-0 p-2.5 h-fit rounded-lg border border-amber-300/30 bg-amber-300/5 text-amber-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold">{title}</h3>
                    <p className="text-xs text-orange-400/80 font-bold" style={{ fontFamily: HI_FONT }}>{hi}</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* what's inside */}
          <section className="space-y-6">
            <div data-fly className="flex items-center gap-3">
              <Seal char="श" size="sm" />
              <h2 className="font-bold tracking-widest uppercase text-sm">
                What&apos;s inside <span className="text-slate-500 font-normal normal-case" style={{ fontFamily: HI_FONT }}>· अंदर क्या है</span>
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-amber-300/30 to-transparent" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MODULES.map(({ hi, title, description, href, icon: Icon }) => (
                <Link
                  key={title}
                  href={href}
                  data-fly
                  className="group in-card p-6 flex flex-col gap-4 hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-[0_0_35px_rgba(249,115,22,0.25)] transition-[transform,box-shadow,border-color] duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-lg border border-amber-300/30 bg-amber-300/5 text-amber-300 group-hover:text-orange-400 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-black text-orange-500/30 group-hover:text-orange-500/70 transition-colors" style={{ fontFamily: HI_FONT }}>{hi}</span>
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-amber-300 transition-colors">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
                </Link>
              ))}
            </div>
          </section>
        </main>

        <footer
          data-fly
          className="relative w-full max-w-7xl mx-auto mb-6 px-5 py-4 rounded-xl border border-amber-300/15 bg-black/40 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-400 tracking-wider uppercase"
        >
          <span>© 2026 Asteroid Gaming Cloud</span>
          <span style={{ fontFamily: HI_FONT }}>गेमिंग क्लाउड ✦ स्वागत है</span>
        </footer>
      </div>

      {/* ═════════════ GIFT OVERLAY (guests only, sits on top of the same page) ═════════════ */}
      {introOn && (
        <div
          className={`fixed inset-0 z-[70] transition-opacity duration-500 ${ending ? "opacity-0" : "opacity-100"}`}
          style={{ pointerEvents: stage === "idle" && !ending ? "auto" : "none" }}
        >
          {/* dark stage backdrop, fades once the box opens */}
          <div
            className={`absolute inset-0 transition-opacity duration-[2200ms] ${bgFaded ? "opacity-0" : "opacity-100"}`}
            style={{ background: "radial-gradient(circle at 50% 58%, #4a1428 0%, #1a0a14 40%, #0b0610 75%)" }}
          />

          {/* three.js canvas host */}
          <div
            ref={canvasHostRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            className={`absolute inset-0 ${boxGone ? "hidden" : ""}`}
          />

          {/* vortex core + flying words */}
          <div
            ref={coreRef}
            className="absolute left-1/2 top-1/2 w-[420px] h-[420px] rounded-full pointer-events-none opacity-0"
            style={{ background: "radial-gradient(circle, rgba(255,153,51,0.55) 0%, rgba(233,30,99,0.22) 38%, rgba(0,0,0,0) 70%)", transform: "translate(-50%, -50%)" }}
          />
          <div ref={wordLayerRef} className="absolute inset-0 pointer-events-none overflow-hidden" />

          {/* prompt */}
          {stage === "idle" && !ending && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-3 pointer-events-none select-none">
              <div className="px-6 py-3 rounded-xl bg-black/85 border border-orange-500/80 backdrop-blur-xl shadow-[0_0_50px_rgba(255,153,51,0.6)] flex items-center space-x-3">
                <Gift className="w-6 h-6 text-orange-400 animate-pulse" />
                <span className="font-mono text-orange-300 text-xs sm:text-sm font-bold uppercase tracking-widest">{hintText}</span>
              </div>
              <div className="flex space-x-2">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`w-3 h-3 rounded-full border border-orange-400 transition-all duration-300 ${
                      clicks >= i ? "bg-orange-400 shadow-[0_0_14px_rgba(255,153,51,0.9)] scale-110" : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* skip */}
          <button
            onClick={skip}
            style={{ pointerEvents: "auto" }}
            className="absolute top-5 right-5 px-3 py-1.5 rounded-md border border-zinc-700 bg-black/60 text-zinc-400 hover:text-orange-400 hover:border-orange-500/60 font-mono text-[11px] tracking-widest uppercase transition-colors"
          >
            Skip ›
          </button>
        </div>
      )}

      <style jsx global>{`
        .nav-slot { display: contents; }

        /* while the gift intro is running: layout hidden, text hidden (words fly in from the box) */
        [data-intro='pending'] [data-fly]:not(.fly-on),
        [data-intro='pending'] .nav-slot > :not(.fly-on) { opacity: 0; }
        [data-intro='pending'] .page-content { pointer-events: none; }
        [data-intro='pending'] .page-content * {
          -webkit-text-fill-color: transparent !important;
          text-shadow: none !important;
        }
        [data-intro='pending'] .page-content .bg-clip-text { background: none !important; }

        .in-card {
          position: relative;
          background: linear-gradient(145deg, rgba(40, 14, 24, 0.85), rgba(12, 8, 20, 0.92));
          border: 1px solid rgba(251, 191, 36, 0.18);
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        .in-card::before,
        .in-card::after {
          content: "";
          position: absolute;
          width: 14px;
          height: 14px;
          pointer-events: none;
        }
        .in-card::before {
          top: -1px;
          left: -1px;
          border-top: 2px solid #f97316;
          border-left: 2px solid #f97316;
          border-top-left-radius: 10px;
        }
        .in-card::after {
          bottom: -1px;
          right: -1px;
          border-bottom: 2px solid #fbbf24;
          border-right: 2px solid #fbbf24;
          border-bottom-right-radius: 10px;
        }

        .jaali {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cg fill='none' stroke='%23fbbf24' stroke-width='1'%3E%3Ccircle cx='24' cy='24' r='4'/%3E%3Ccircle cx='24' cy='24' r='10'/%3E%3Cpath d='M24 2 L29 24 L24 46 L19 24 Z'/%3E%3Cpath d='M2 24 L24 19 L46 24 L24 29 Z'/%3E%3Ccircle cx='0' cy='0' r='6'/%3E%3Ccircle cx='48' cy='0' r='6'/%3E%3Ccircle cx='0' cy='48' r='6'/%3E%3Ccircle cx='48' cy='48' r='6'/%3E%3C/g%3E%3C/svg%3E");
          background-size: 48px 48px;
        }

        .petal {
          position: absolute;
          top: -5%;
          background: radial-gradient(circle at 30% 30%, #ffd166, #ff8c1a);
          border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
          opacity: 0.6;
          animation-name: petalFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          filter: drop-shadow(0 0 4px rgba(255, 140, 26, 0.5));
        }
        .petal:nth-child(3n) {
          background: radial-gradient(circle at 30% 30%, #ff9ec4, #e91e63);
          filter: drop-shadow(0 0 4px rgba(233, 30, 99, 0.45));
        }
        @keyframes petalFall {
          0%   { transform: translate3d(0, -5vh, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.6; }
          50%  { transform: translate3d(60px, 50vh, 0) rotate(180deg); }
          100% { transform: translate3d(-30px, 110vh, 0) rotate(380deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}