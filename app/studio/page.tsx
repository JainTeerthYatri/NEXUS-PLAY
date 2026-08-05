"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { 
  Sparkles, ShieldAlert, Cpu, Terminal, Zap, 
  CheckCircle2, Lock, ArrowRight, Layout, Code
} from "lucide-react";

export default function StudioPage() {
  const [userRole, setUserRole] = useState<string>("member");
  const [loading, setLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSuccess, setBuildSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function checkUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
      setLoading(false);
    }
    checkUserRole();
  }, [supabase]);

  const handleTriggerBuild = () => {
    setIsBuilding(true);
    setBuildSuccess(false);
    setTimeout(() => {
      setIsBuilding(false);
      setBuildSuccess(true);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#020617] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-mono text-xs sm:text-sm text-cyan-400 animate-pulse">
          SYNCHRONIZING_SECURITY_CLEARANCE...
        </div>
      </div>
    );
  }

  // Check if user has privileged clearance (Owner or Moderator)
  const isPrivileged = userRole === "owner" || userRole === "moderator";

  return (
    <div className="min-h-[100dvh] bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      {/* Background Neon Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full flex flex-col gap-6 relative z-10">
        
        {/* Studio Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
              <span className="truncate">ASTEROID_STUDIO // V1.2_RELEASE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Asteroid Studio Development
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/60 mt-1">
              Current User Clearance Level: <span className="text-cyan-400 font-mono uppercase font-bold">{userRole}</span>
            </p>
          </div>

          {isPrivileged && (
            <button
              onClick={handleTriggerBuild}
              disabled={isBuilding}
              className="w-full lg:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Zap className={`w-4 h-4 ${isBuilding ? 'animate-spin' : ''}`} />
              {isBuilding ? "Compiling v1.2..." : "Deploy Update"}
            </button>
          )}
        </div>

        {/* CONDITIONAL RENDERING BASED ON ROLE */}
        {!isPrivileged ? (
          /* NOTICE CONTAINER FOR MEMBERS */
          <div className="flex-1 flex items-center justify-center py-12 px-4">
            <div className="max-w-xl w-full p-6 sm:p-10 rounded-2xl bg-[#0b0f19]/90 border border-cyan-500/40 text-center shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Lock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 uppercase">
                  SECURITY_NOTICE // CLEARANCE_RESTRICTED
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Asteroid Studio Feature Coming Soon
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed pt-2">
                  The Asteroid Studio feature is currently under active architecture development and will be launching globally in the **next software update v1.2**. Stay tuned, operators!
                </p>
              </div>

              <div className="pt-4 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a 
                  href="/dashboard"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
                >
                  Return to Dashboard <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* REAL DEVELOPMENT WORKSPACE FOR OWNERS & MODERATORS */
          <div className="flex flex-col gap-6 animate-fade-in">
            {buildSuccess && (
              <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 flex items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                <p className="text-xs sm:text-sm font-mono">
                  Build successful! Studio Next v1.2 Neon Blue + Cyan packages compiled and synchronized across all administrative nodes.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-cyan-400">NODE_STATUS</span>
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-xl font-black text-white">Active Pipeline</h3>
                <p className="text-xs text-slate-400 mt-1">Real-time compilation tracking enabled for mods/owners.</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-blue-400">THEME_ENGINE</span>
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-xl font-black text-white">Neon Blue + Cyan</h3>
                <p className="text-xs text-slate-400 mt-1">Aesthetic color variables fully injected into workspace.</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-emerald-400">ACCESS_LEVEL</span>
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-white uppercase">{userRole} Override</h3>
                <p className="text-xs text-slate-400 mt-1">Full development workspace unlocked for your clearance.</p>
              </div>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-[#0b0f19]/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-cyan-400" /> Live Architecture Console
                </h3>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400">
                  DEVELOPMENT_MODE
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#020617] border border-cyan-500/20 font-mono text-xs text-slate-300 space-y-2">
                <p className="text-cyan-400">[SYSTEM] User clearance authenticated as <span className="uppercase text-white font-bold">{userRole}</span>.</p>
                <p className="text-slate-400">[STUDIO] Loading module components for next software update v1.2...</p>
                <p className="text-blue-400">[RENDER] Visual canvas responsive across mobile, tablet, laptop, and PC devices.</p>
                <p className="text-emerald-400 font-bold">[READY] All systems functional. Ready for code deployment.</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
