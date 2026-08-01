"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { 
  Trophy, Users, Radio, ArrowRight, Terminal, Zap, 
  Video, Sparkles, LayoutDashboard 
} from "lucide-react";

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function checkUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (data) setProfile(data);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    }
    checkUserSession();
  }, [supabase]);

  // Matrix Green Code Rain Effect (Background Only)
  useEffect(() => {
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

    const letters = "0101010101XYZTECHMATRIX_NEXUSPLAY";
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array.from({ length: columns }).fill(1) as number[];

    const handleResize = () => {
      setCanvasDimensions();
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }).fill(1) as number[];
    };

    window.addEventListener("resize", handleResize);

    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 12, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#10b981";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
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
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col relative overflow-x-hidden">
      
      {/* Background Matrix Rain */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full pointer-events-none opacity-40 z-0" 
      />

      {/* Angular Neon Border Framing */}
      <div className="absolute inset-4 sm:inset-8 pointer-events-none z-1 border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]">
        <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-emerald-500 to-transparent shadow-[0_0_15px_#10b981]" />
        <div className="absolute top-0 left-0 w-1 h-32 bg-gradient-to-b from-emerald-500 to-transparent shadow-[0_0_15px_#10b981]" />
        <div className="absolute bottom-0 right-0 w-32 h-1 bg-gradient-to-l from-purple-500 to-transparent shadow-[0_0_15px_#a855f7]" />
        <div className="absolute bottom-0 right-0 w-1 h-32 bg-gradient-to-t from-purple-500 to-transparent shadow-[0_0_15px_#a855f7]" />
      </div>

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative z-10 w-full max-w-7xl mx-auto">
        
        {user ? (
          <div className="w-full space-y-10 text-left">
            <div className="p-8 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#121216]/90 to-[#121216]/90 border border-emerald-500/30 relative overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0a0a0c] border border-emerald-500/40 text-xs font-mono text-emerald-400">
                    <Terminal className="w-3.5 h-3.5 animate-pulse" />
                    <span>OPERATOR_ONLINE // @{profile?.username || "creator"}</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Welcome back, {profile?.display_name || "Operator"}!
                  </h1>
                  <p className="text-sm text-slate-400 max-w-xl">
                    Your streaming pipelines and squad matrices are fully synchronized. Launch the broadcasting studio or manage your telemetry configurations.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href="/studio"
                    className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                  >
                    <Video className="w-4 h-4" /> Launch OBS Studio
                  </Link>
                  <Link
                    href="/dashboard"
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-bold text-xs font-mono transition-all flex items-center gap-2 backdrop-blur-md"
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Control Center
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" /> Ecosystem Navigation Matrix
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/clips" className="p-6 rounded-xl bg-[#121216]/80 border border-white/10 hover:border-emerald-500/40 transition-all group backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Explore Clips</h3>
                  <p className="text-xs text-slate-400">Browse community highlights and upvote vaults.</p>
                </Link>

                <Link href="/squads" className="p-6 rounded-xl bg-[#121216]/80 border border-white/10 hover:border-red-500/40 transition-all group backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Squad Directory</h3>
                  <p className="text-xs text-slate-400">Join active gaming teams or deploy squads.</p>
                </Link>

                <Link href="/lfg" className="p-6 rounded-xl bg-[#121216]/80 border border-white/10 hover:border-violet-500/40 transition-all group backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Neural LFG Board</h3>
                  <p className="text-xs text-slate-400">Matchmake with regional skill vectors instantly.</p>
                </Link>

                <Link href="/settings" className="p-6 rounded-xl bg-[#121216]/80 border border-white/10 hover:border-blue-500/40 transition-all group backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-white mb-1">Account Specs</h3>
                  <p className="text-xs text-slate-400">Manage creator handles, bio, and avatars.</p>
                </Link>
              </div>
            </div>

          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8 text-center">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#0a0a0c]/80 border border-emerald-500/40 text-xs font-mono text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-md">
              <Terminal className="w-3.5 h-3.5 animate-pulse" />
              <span>NEXUS PLAY PLATFORM v1.0 // SECURE_MATRIX</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white">
              EXECUTE LOBBY DOMINANCE. <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">
                NEXT-GEN CREATOR ECOSYSTEM.
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 font-normal">
              Unify elite squad matchmaking, active LFG boards, and high-impact clip vaults into a single lightning-fast web interface.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth"
                className="w-full sm:w-auto px-8 py-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 group"
              >
                <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/clips"
                className="w-full sm:w-auto px-8 py-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-sm backdrop-blur-md transition-all flex items-center justify-center gap-2"
              >
                Explore Clip Vault
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-28 w-full text-left">
              
              <div className="p-6 rounded-xl bg-[#121216]/80 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Neural LFG Matrix</h3>
                <p className="text-sm text-slate-400">
                  Deploy automated matchmaking nodes, filter regional skill vectors, and form cohesive teams instantly.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#121216]/80 border border-white/10 hover:border-purple-500/40 transition-all duration-300 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Community Clips Vault</h3>
                <p className="text-sm text-slate-400">
                  Explore, watch, and upvote high-impact creator highlight video vaults with real-time Supabase database tracking.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-[#121216]/80 border border-white/10 hover:border-blue-500/40 transition-all duration-300 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Broadcasting Hub</h3>
                <p className="text-sm text-slate-400">
                  Browser-based OBS telemetry and WebSocket streaming workspace scheduled for an upcoming software update.
                </p>
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}