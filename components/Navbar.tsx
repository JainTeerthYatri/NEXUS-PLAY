"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, 
  Radio, 
  Compass, 
  LogOut, 
  Video, 
  LayoutDashboard, 
  Settings, 
  ShieldAlert, 
  Menu, 
  X,
  MessageSquare
} from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("member");
  const [loadingRole, setLoadingRole] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile) setRole(profile.role || "member");
      } else {
        setUser(null);
        setRole("member");
      }
      setLoadingRole(false);
    }
    getUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single();
        setRole(profile?.role || "member");
      } else {
        setRole("member");
      }
      setLoadingRole(false);
      router.refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  async function handleSignOut() {
    setUser(null);
    setRole("member");
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-cyan-500/20 bg-[#060b14]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left Section: Brand Logo & Core Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-black text-white text-lg tracking-wider shrink-0">
            <span className="w-3 h-3 bg-red-600 rounded-sm inline-block shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
            NEXUS<span className="text-red-500">PLAY</span>
          </Link>

          {/* Desktop Core Links */}
          <div className="hidden md:flex items-center gap-1.5 pl-4 border-l border-cyan-500/20">
            <Link 
              href="/squads" 
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 ${
                isActive('/squads') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-red-500" /> Squads
            </Link>

            <Link 
              href="/clips" 
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 ${
                isActive('/clips') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-500" /> Clips
            </Link>

            <Link 
              href="/lfg" 
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 ${
                isActive('/lfg') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-violet-500" /> LFG
            </Link>

            <Link 
              href="/chat" 
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 ${
                isActive('/chat') ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Chat
            </Link>

            <Link 
              href="/studio" 
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 ${
                isActive('/studio') ? 'bg-red-950/60 border border-red-500/30 text-red-400 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-red-500" /> Studio
            </Link>
          </div>
        </div>

        {/* Right Section: Icon-only Controls & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2">
              {/* Icon-only Dashboard */}
              <Link 
                href="/dashboard"
                className={`p-2 rounded bg-[#0b1324] border transition-all flex items-center justify-center ${
                  isActive('/dashboard') ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-cyan-500/30 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/60'
                }`}
                title="Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
              </Link>

              {/* Icon-only Settings */}
              <Link 
                href="/settings"
                className={`p-2 rounded bg-[#0b1324] border transition-all flex items-center justify-center ${
                  isActive('/settings') ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-cyan-500/30 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/60'
                }`}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>

              {/* Icon-only Mod Panel (Owner/Mod only) */}
              {!loadingRole && (role === "owner" || role === "moderator") && (
                <Link 
                  href="/mod"
                  className={`p-2 rounded bg-[#0b1324] border transition-all flex items-center justify-center ${
                    isActive('/mod') ? 'border-red-500 text-red-400 bg-red-950/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-red-500/30 text-red-400/80 hover:text-red-400 hover:border-red-500/60'
                  }`}
                  title="Mod Panel"
                >
                  <ShieldAlert className="w-4 h-4" />
                </Link>
              )}

              <button 
                onClick={handleSignOut}
                className="p-2 rounded bg-[#0b1324] hover:bg-red-600/20 border border-cyan-500/30 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                href="/auth/login" 
                className="px-4 py-2 rounded bg-[#0b1324] hover:bg-cyan-500/10 border border-cyan-500/30 text-slate-200 text-xs font-bold transition-colors font-mono"
              >
                Login
              </Link>
              <Link 
                href="/auth/signup" 
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)] font-mono"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Menu Toggle Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded bg-[#0b1324] border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            title="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-cyan-500/20 bg-[#060b14]/95 backdrop-blur-xl px-4 py-4 space-y-2">
          <Link 
            href="/squads" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded text-xs font-mono transition-all ${
              isActive('/squads') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Squads
          </Link>
          <Link 
            href="/clips" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded text-xs font-mono transition-all ${
              isActive('/clips') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Clips Vault
          </Link>
          <Link 
            href="/lfg" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded text-xs font-mono transition-all ${
              isActive('/lfg') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            LFG Board
          </Link>
          <Link 
            href="/chat" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded text-xs font-mono transition-all ${
              isActive('/chat') ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            Global Chat
          </Link>
          <Link 
            href="/studio" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded text-xs font-mono transition-all ${
              isActive('/studio') ? 'bg-red-950/60 border border-red-500/30 text-red-400 font-bold' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            NEXUS Studio
          </Link>

          {user && (
            <div className="pt-2 border-t border-cyan-500/20 space-y-2">
              <Link 
                href="/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-xs font-mono transition-all ${
                  isActive('/dashboard') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/settings" 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded text-xs font-mono transition-all ${
                  isActive('/settings') ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                Settings
              </Link>
              {!loadingRole && (role === "owner" || role === "moderator") && (
                <Link 
                  href="/mod" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded text-xs font-mono transition-all ${
                    isActive('/mod') ? 'bg-red-950/60 border border-red-500/30 text-red-400 font-bold' : 'text-red-400 hover:bg-red-950/20'
                  }`}
                >
                  Mod Panel
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}