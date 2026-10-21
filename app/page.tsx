"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Trophy, Users, Radio, ArrowRight, Zap, Video, Sparkles, MessageSquare,
  Shield, UserCheck, UserPlus, Award, Wifi, WifiOff, Pencil, Play,
} from "lucide-react";

// GiftIntro ko dynamic import karo (SSR avoid)
const GiftIntro = dynamic(() => import("@/components/GiftIntro"), {
  ssr: false,
});

/* ───────────────────────── CONFIG (edit these to match your DB / routes) ───────────────────────── */

// Where each dashboard counter is read from. Wrong table/column => it just shows 0 (no crash).
const STAT_SOURCES = {
  clips:     { table: "clips",         column: "user_id" },
  squads:    { table: "squad_members", column: "user_id" },
  lfg:       { table: "lfg_posts",     column: "user_id" },
  followers: { table: "follows",       column: "following_id" },
  following: { table: "follows",       column: "follower_id" },
} as const;

type StatKey = keyof typeof STAT_SOURCES;

const XP_PER_LEVEL = 500;

const RANKS = [
  { en: "Bronze Operator", jp: "銅" },
  { en: "Silver Operator", jp: "銀" },
  { en: "Gold Operator", jp: "金" },
  { en: "Platinum Operator", jp: "白金" },
  { en: "Diamond Operator", jp: "金剛" },
  { en: "Legend Operator", jp: "伝説" },
];

const STAT_CARDS: { key: StatKey; label: string; jp: string; icon: typeof Trophy }[] = [
  { key: "clips", label: "Highlight Clips", jp: "動画", icon: Trophy },
  { key: "squads", label: "Squad Lobbies", jp: "部隊", icon: Users },
  { key: "lfg", label: "LFG Nodes", jp: "募集", icon: Radio },
  { key: "followers", label: "Followers", jp: "仲間", icon: UserCheck },
  { key: "following", label: "Following", jp: "追う", icon: UserPlus },
];

const QUICK_ACTIONS = [
  { label: "Launch Studio", jp: "配信", desc: "Go live with the web broadcast studio", href: "/studio", icon: Radio },
  { label: "Find a Squad", jp: "仲間", desc: "Join or host an LFG lobby", href: "/lfg", icon: Users },
  { label: "Post a Clip", jp: "動画", desc: "Upload a highlight, earn XP", href: "/clips", icon: Video },
  { label: "Open Chat", jp: "会話", desc: "Talk with the community, encrypted", href: "/chat", icon: MessageSquare },
  { label: "Thumbnail Forge", jp: "創作", desc: "Generate thumbnails & logos with AI", href: "/dashboard", icon: Sparkles },
];

const MODULES = [
  { jp: "配信", title: "Universal Web-OBS Studio", description: "Browser-native live broadcasting compositor with multi-layer canvas, facecam PiP, and direct RTMP streaming bridge.", href: "/studio", icon: Radio },
  { jp: "創作", title: "AI Thumbnail & Logo Forge", description: "Zero-cost neural text-to-image engine with real-time progress steps and 2D canvas sticker overlay editors.", href: "/dashboard", icon: Sparkles },
  { jp: "会話", title: "Unrestricted Global Comms", description: "Real-time open chat rooms with instant moderation and Web Crypto API end-to-end encrypted direct messaging.", href: "/chat", icon: MessageSquare },
  { jp: "仲間", title: "Neural LFG Matchmaker", description: "Automated regional skill filters, slot-locked party lobbies, and live squad host controls.", href: "/lfg", icon: Users },
  { jp: "動画", title: "Highlight Clips Vault", description: "Scroll-snap vertical shorts video feed with strict 2MB validation and automatic XP leveling rewards.", href: "/clips", icon: Video },
  { jp: "守護", title: "5-Tier RBAC Command Center", description: "Comprehensive moderation dashboard with audit logs, ban enforcement, and DPDP Act compliance desks.", href: "/mod", icon: Shield },
];

/* ───────────────────────── types & helpers ───────────────────────── */

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

type Stats = Record<StatKey, number>;
const EMPTY_STATS: Stats = { clips: 0, squads: 0, lfg: 0, followers: 0, following: 0 };

async function countRows(
  supabase: ReturnType<typeof createClient>,
  table: string,
  column: string,
  uid: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, uid);
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
}

function greetingFor(hour: number) {
  if (hour < 5) return { jp: "こんばんは", en: "Good night" };
  if (hour < 12) return { jp: "おはよう", en: "Good morning" };
  if (hour < 18) return { jp: "こんにちは", en: "Good afternoon" };
  return { jp: "こんばんは", en: "Good evening" };
}

/** Red hanko (name seal) with a kanji or initial */
function Hanko({ char, size = "md" }: { char: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "w-16 h-16 text-3xl" : size === "sm" ? "w-7 h-7 text-sm" : "w-11 h-11 text-xl";
  return (
    <span
      className={`inline-flex items-center justify-center ${dims} bg-red-600 text-amber-50 font-black rounded-sm -rotate-6 shadow-[0_0_18px_rgba(239,68,68,0.55)] border-2 border-double border-amber-200/70 select-none`}
      style={{ fontFamily: "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" }}
    >
      {char}
    </span>
  );
}

function ToriiGate({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 150" className={className} aria-hidden="true">
      <path d="M6 30 Q100 6 194 30 L190 46 Q100 26 10 46 Z" fill="currentColor" />
      <rect x="26" y="52" width="148" height="9" fill="currentColor" />
      <rect x="44" y="46" width="13" height="100" fill="currentColor" />
      <rect x="143" y="46" width="13" height="100" fill="currentColor" />
      <rect x="92" y="34" width="16" height="20" fill="currentColor" />
    </svg>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [authReady, setAuthReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [introReady, setIntroReady] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // localStorage check
  useEffect(() => {
    const seen = localStorage.getItem("astroid-gift-seen");
    if (seen === "true") {
      setShowIntro(false);
    }
    setIntroReady(true);
  }, []);

  // Auth + profile + stats
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || cancelled) return;
        setUser(session.user);

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (data && !cancelled) setProfile(data as Profile);

        const keys = Object.keys(STAT_SOURCES) as StatKey[];
        const counts = await Promise.all(
          keys.map((k) => countRows(supabase, STAT_SOURCES[k].table, STAT_SOURCES[k].column, session.user.id))
        );
        if (!cancelled) {
          setStats(Object.fromEntries(keys.map((k, i) => [k, counts[i]])) as Stats);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  // Katakana / kanji rain (only after intro)
  useEffect(() => {
    if (showIntro) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasDimensions();

    const letters = "アストロイドゲーミングクラウド星雲龍虎侍忍者桜炎雷風01";
    const fontSize = 16;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array.from({ length: columns }).fill(1) as number[];

    const handleResize = () => {
      setCanvasDimensions();
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }).fill(1) as number[];
    };
    window.addEventListener("resize", handleResize);

    const draw = () => {
      ctx.fillStyle = "rgba(7, 6, 11, 0.13)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "Hiragino Sans","Yu Gothic","Noto Sans JP",monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
        ctx.fillStyle = i % 9 === 0 ? "#f5c451" : "#ef4444";
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [showIntro]);

  const handleIntroComplete = () => {
    localStorage.setItem("astroid-gift-seen", "true");
    setShowIntro(false);
  };

  // deterministic sakura petals (no hydration mismatch)
  const petals = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        delay: (i * 1.7) % 12,
        duration: 12 + ((i * 5) % 9),
        size: 8 + ((i * 3) % 9),
      })),
    []
  );

  // derived profile values
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

  // Jab tak localStorage check nahi hua
  if (!introReady) {
    return <div className="fixed inset-0 bg-[#07060b]" />;
  }

  // Intro dikhao
  if (showIntro) {
    return <GiftIntro onComplete={handleIntroComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#07060b] text-slate-100 flex flex-col relative overflow-x-hidden">
      {/* katakana rain */}
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none opacity-25 z-0" />

      {/* seigaiha (wave) pattern + vermilion glow */}
      <div className="seigaiha fixed inset-0 pointer-events-none z-0 opacity-[0.07]" />
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(239,68,68,0.22), transparent 70%)" }}
      />

      {/* sakura petals */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        {petals.map((p, i) => (
          <span
            key={i}
            className="petal"
            style={{ left: `${p.left}%`, width: p.size, height: p.size, animationDelay: `-${p.delay}s`, animationDuration: `${p.duration}s` }}
          />
        ))}
      </div>

      {/* frame */}
      <div className="absolute inset-4 sm:inset-8 pointer-events-none z-[1] border border-amber-300/15 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-red-500 to-transparent shadow-[0_0_15px_#ef4444]" />
        <div className="absolute top-0 left-0 w-1 h-32 bg-gradient-to-b from-red-500 to-transparent shadow-[0_0_15px_#ef4444]" />
        <div className="absolute bottom-0 right-0 w-32 h-1 bg-gradient-to-l from-amber-300 to-transparent shadow-[0_0_15px_#f5c451]" />
        <div className="absolute bottom-0 right-0 w-1 h-32 bg-gradient-to-t from-amber-300 to-transparent shadow-[0_0_15px_#f5c451]" />
      </div>

      {/* vertical kanji watermarks */}
      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none select-none z-[1] text-red-500/20 font-black text-4xl tracking-[0.4em]"
        style={{ writingMode: "vertical-rl" }}
      >
        ゲーミングクラウド
      </div>
      <div
        className="fixed right-4 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none select-none z-[1] text-amber-300/20 font-black text-2xl tracking-[0.5em]"
        style={{ writingMode: "vertical-rl" }}
      >
        星雲 ・ ASTEROID
      </div>

      <Navbar />

      <main className="flex-1 flex flex-col items-stretch px-4 sm:px-6 lg:px-8 py-14 relative z-10 w-full max-w-7xl mx-auto">
        {!authReady ? (
          /* loading skeleton (prevents guest flash) */
          <div className="space-y-6 animate-pulse">
            <div className="h-8 w-64 rounded bg-white/5" />
            <div className="h-24 rounded-xl bg-white/5" />
            <div className="h-20 rounded-xl bg-white/5" />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-white/5" />)}
            </div>
          </div>
        ) : user ? (
          /* ───────────── LOGGED IN: control center ───────────── */
          <div className="space-y-8">
            {/* header */}
            <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pb-6 border-b border-amber-300/15">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-red-500/40 bg-red-500/10 text-red-300 font-mono text-xs tracking-wider">
                  <span>創作拠点</span>
                  <span className="text-amber-300/70">//</span>
                  <span>CREATOR_HUB</span>
                  <span className="text-amber-300/70">//</span>
                  <span>@{handle.toUpperCase()}</span>
                </div>

                <p className="font-mono text-sm text-amber-300/90 tracking-widest">
                  {greet.jp} <span className="text-slate-500">·</span> {greet.en}
                </p>

                <h1 className="text-3xl sm:text-5xl font-black tracking-tight flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span>Welcome back,</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-300 uppercase">
                    {displayName}
                  </span>
                  <Hanko char="星" size="sm" />
                </h1>

                <p className="text-slate-300 max-w-2xl">
                  Your control center is online. <span className="text-amber-300 font-semibold">Start your work</span> — go live, squad up or drop a fresh clip.
                </p>
                <p className="text-sm text-slate-500">
                  ようこそ、{displayName}さん。さあ、始めましょう。 &nbsp;·&nbsp; आपका स्वागत है — अपना काम शुरू करें।
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md border font-mono text-xs font-bold tracking-wider ${
                    isLive ? "border-red-500/60 bg-red-500/15 text-red-300" : "border-slate-600/60 bg-white/5 text-slate-400"
                  }`}
                >
                  {isLive ? <Wifi className="w-4 h-4 animate-pulse" /> : <WifiOff className="w-4 h-4" />}
                  {isLive ? "LIVE" : "OFFLINE"}
                </span>
                <Link
                  href="/studio"
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-md bg-gradient-to-r from-red-600 to-red-500 text-white font-bold text-sm shadow-[0_0_28px_rgba(239,68,68,0.5)] hover:shadow-[0_0_40px_rgba(239,68,68,0.8)] hover:scale-105 transition-all active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  Launch Studio
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </header>

            {/* profile card */}
            <section className="jp-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="w-20 h-20 rounded-lg object-cover border-2 border-amber-300/40 shadow-[0_0_20px_rgba(245,196,81,0.25)]"
                  />
                ) : (
                  <Hanko char={displayName.charAt(0).toUpperCase()} size="lg" />
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
                  <span className="text-red-300 font-bold">@{handle.toUpperCase()}</span>
                  <span># UID: {user.id.slice(0, 13)}…</span>
                </p>
                <p className="text-sm text-slate-300">
                  {profile?.bio || "No telemetry bio initialized yet. Update your profile parameters to broadcast details."}
                </p>
              </div>

              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-amber-300/30 bg-white/[0.03] text-slate-200 text-sm font-medium hover:border-red-500/60 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </Link>
            </section>

            {/* level */}
            <section className="jp-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 font-bold tracking-wide">
                  <Award className="w-5 h-5 text-amber-300" />
                  <span className="uppercase">Level {level}</span>
                  <span className="text-slate-500">—</span>
                  <span className="text-amber-300 uppercase">{rank.en}</span>
                  <span className="text-red-400 font-black text-lg" style={{ fontFamily: "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" }}>
                    {rank.jp}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {xpInto} / {XP_PER_LEVEL} XP (Total: {totalXp} XP)
                </span>
              </div>
              <div className="h-3 rounded-full bg-black/60 border border-amber-300/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 via-orange-400 to-amber-300 shadow-[0_0_14px_rgba(239,68,68,0.7)] transition-all duration-1000"
                  style={{ width: `${Math.max(2, (xpInto / XP_PER_LEVEL) * 100)}%` }}
                />
              </div>
            </section>

            {/* stats */}
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {STAT_CARDS.map(({ key, label, jp, icon: Icon }) => (
                <div key={key} className="jp-card p-5 flex items-start justify-between hover:-translate-y-1 hover:border-red-500/50 transition-all duration-300">
                  <div>
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="text-[11px] text-red-400/80 font-bold tracking-widest mt-0.5">{jp}</p>
                    <p className="text-3xl font-black mt-3">{stats[key]}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-amber-300/30 bg-amber-300/5 text-amber-300">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </section>

            {/* start your work */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Hanko char="始" size="sm" />
                <h3 className="font-bold tracking-widest uppercase text-sm">
                  Start your work <span className="text-slate-500 font-normal">· 始めよう</span>
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-amber-300/30 to-transparent" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {QUICK_ACTIONS.map(({ label, jp, desc, href, icon: Icon }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group jp-card p-5 flex flex-col gap-3 hover:-translate-y-1 hover:border-red-500/60 hover:shadow-[0_0_30px_rgba(239,68,68,0.25)] transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-6 h-6 text-red-400 group-hover:text-amber-300 transition-colors" />
                      <span className="text-2xl font-black text-amber-300/30 group-hover:text-amber-300/70 transition-colors">{jp}</span>
                    </div>
                    <p className="font-bold">{label}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-red-300 group-hover:text-amber-300 transition-colors">
                      <Play className="w-3 h-3" /> Begin <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* ───────────── GUEST ───────────── */
          <div className="space-y-16">
            <section className="relative text-center space-y-7 max-w-4xl mx-auto pt-6">
              <ToriiGate className="absolute left-1/2 -translate-x-1/2 -top-6 w-72 h-52 text-red-600/10 pointer-events-none" />
              <div className="relative flex justify-center"><Hanko char="星" size="lg" /></div>
              <p className="relative font-mono text-xs tracking-[0.4em] text-amber-300/80">ゲーミング・クラウド // GAMING CLOUD</p>
              <h1 className="relative text-5xl sm:text-7xl font-black tracking-tight uppercase">
                ASTEROID{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-300">GAMING CLOUD</span>
              </h1>
              <p className="relative text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Stream, chat, clip and squad up — six modules, one cloud. Log in to open your personal control center.
              </p>
              <div className="relative flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-md bg-gradient-to-r from-red-600 to-red-500 text-white font-bold shadow-[0_0_30px_rgba(239,68,68,0.55)] hover:scale-105 transition-all active:scale-95"
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

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MODULES.map(({ jp, title, description, href, icon: Icon }) => (
                <Link
                  key={title}
                  href={href}
                  className="group jp-card p-6 flex flex-col gap-4 hover:-translate-y-1 hover:border-red-500/60 hover:shadow-[0_0_35px_rgba(239,68,68,0.25)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-lg border border-amber-300/30 bg-amber-300/5 text-amber-300 group-hover:text-red-400 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-red-500/30 group-hover:text-red-500/70 transition-colors">{jp}</span>
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-amber-300 transition-colors">{title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
                </Link>
              ))}
            </section>
          </div>
        )}
      </main>

      <style jsx global>{`
        .jp-card {
          position: relative;
          background: linear-gradient(145deg, rgba(28, 12, 20, 0.85), rgba(10, 8, 18, 0.92));
          border: 1px solid rgba(245, 196, 81, 0.18);
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        .jp-card::before,
        .jp-card::after {
          content: "";
          position: absolute;
          width: 14px;
          height: 14px;
          pointer-events: none;
        }
        .jp-card::before {
          top: -1px;
          left: -1px;
          border-top: 2px solid #ef4444;
          border-left: 2px solid #ef4444;
          border-top-left-radius: 10px;
        }
        .jp-card::after {
          bottom: -1px;
          right: -1px;
          border-bottom: 2px solid #f5c451;
          border-right: 2px solid #f5c451;
          border-bottom-right-radius: 10px;
        }

        .seigaiha {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='30' viewBox='0 0 60 30'%3E%3Cg fill='none' stroke='%23f5c451' stroke-width='1'%3E%3Ccircle cx='30' cy='30' r='28'/%3E%3Ccircle cx='30' cy='30' r='21'/%3E%3Ccircle cx='30' cy='30' r='14'/%3E%3Ccircle cx='30' cy='30' r='7'/%3E%3Ccircle cx='0' cy='15' r='28'/%3E%3Ccircle cx='0' cy='15' r='21'/%3E%3Ccircle cx='0' cy='15' r='14'/%3E%3Ccircle cx='0' cy='15' r='7'/%3E%3Ccircle cx='60' cy='15' r='28'/%3E%3Ccircle cx='60' cy='15' r='21'/%3E%3Ccircle cx='60' cy='15' r='14'/%3E%3Ccircle cx='60' cy='15' r='7'/%3E%3C/g%3E%3C/svg%3E");
          background-size: 60px 30px;
        }

        .petal {
          position: absolute;
          top: -5%;
          background: linear-gradient(135deg, #ffd1dc, #ff9eb5);
          border-radius: 150% 0 150% 0;
          opacity: 0.55;
          animation-name: petalFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          filter: drop-shadow(0 0 4px rgba(255, 158, 181, 0.5));
        }
        @keyframes petalFall {
          0%   { transform: translate3d(0, -5vh, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.55; }
          50%  { transform: translate3d(60px, 50vh, 0) rotate(180deg); }
          100% { transform: translate3d(-30px, 110vh, 0) rotate(380deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
