"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { calculateOperatorTier } from "@/utils/leveling";
import { 
  LayoutDashboard, Trophy, Users, Radio, ArrowUpRight, Plus, 
  Video, Wifi, WifiOff, UserCheck, Shield, User, Hash, Sparkles, Award 
} from "lucide-react";
import Link from "next/link";

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  is_live: boolean;
  xp?: number;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({
    clipsCount: 0,
    squadsCount: 0,
    lfgCount: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [togglingLive, setTogglingLive] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCreatorData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch complete profile data from profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // 2. Fetch counts across tables in parallel
      const [clipsRes, squadsRes, lfgRes, followersRes, followingRes] = await Promise.all([
        supabase.from("clips").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("squads").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("lfg_listings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
      ]);

      setStats({
        clipsCount: clipsRes.count || 0,
        squadsCount: squadsRes.count || 0,
        lfgCount: lfgRes.count || 0,
        followersCount: followersRes.count || 0,
        followingCount: followingRes.count || 0,
      });

      setLoading(false);
    }

    fetchCreatorData();
  }, [supabase]);

  async function toggleLiveStatus() {
    if (!profile) return;
    setTogglingLive(true);

    const nextStatus = !profile.is_live;
    const { error } = await supabase
      .from("profiles")
      .update({ is_live: nextStatus })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, is_live: nextStatus });
    } else {
      alert("Error updating live telemetry: " + error.message);
    }
    setTogglingLive(false);
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#060b14] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-mono text-sm text-cyan-400 animate-pulse">
          SYNCHRONIZING_OPERATOR_TELEMETRY...
        </div>
      </div>
    );
  }

  // Use real database XP, defaults to 0 if not set
  const userXp = profile?.xp || 0; 
  const tierData = calculateOperatorTier(userXp);

  return (
    <div className="min-h-[100dvh] bg-[#060b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full space-y-6 sm:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0b1324] border border-cyan-500/40 text-xs font-mono text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.15)] truncate max-w-full">
              <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">CREATOR_HUB // @{profile?.username || "operator"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Creator Control Center</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage broadcast telemetry vectors, live status nodes, and community follower matrices.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Live Status Toggle */}
            <button
              onClick={toggleLiveStatus}
              disabled={togglingLive}
              className={`px-3.5 sm:px-4 py-2 rounded text-xs font-bold font-mono transition-all flex items-center gap-2 border cursor-pointer ${
                profile?.is_live 
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
                  : 'bg-[#0b1324] border-cyan-500/20 text-slate-400 hover:text-white hover:border-cyan-500/40'
              }`}
            >
              {profile?.is_live ? <Wifi className="w-4 h-4 animate-pulse text-cyan-400 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
              <span className="truncate">{profile?.is_live ? "BROADCASTING_LIVE" : "OFFLINE"}</span>
            </button>

            <Link 
              href="/studio"
              className="px-3.5 sm:px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-slate-950" /> Launch Studio
            </Link>
          </div>
        </div>

        {/* Operator Unique Identity Card */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[#0b1324] border border-cyan-500/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-4 sm:gap-5 min-w-0 w-full md:w-auto">
            {/* Avatar Container */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#060b14] border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-black text-xl sm:text-2xl shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)] overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" />
              )}
            </div>

            {/* Operator Details */}
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white truncate max-w-[200px] sm:max-w-sm">{profile?.display_name || "Anonymous Operator"}</h2>
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 uppercase tracking-wider shadow-[0_0_8px_rgba(6,182,212,0.2)] shrink-0">
                  {profile?.role || "user"}
                </span>
                {profile?.is_live && (
                  <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-[10px] font-mono text-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)] shrink-0">
                    ● LIVE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-wrap">
                <span className="text-cyan-400 font-semibold truncate max-w-[150px]">@{profile?.username || "unknown"}</span>
                <span className="flex items-center gap-1 text-slate-500 truncate max-w-[220px]">
                  <Hash className="w-3.5 h-3.5 text-cyan-500/60 shrink-0" /> UID: <span className="truncate">{profile?.id}</span>
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-2 max-w-xl break-words">
                {profile?.bio || "No telemetry bio initialized yet. Update your profile parameters to broadcast details."}
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              href="/settings"
              className="w-full md:w-auto justify-center px-4 py-2 rounded bg-[#060b14] border border-cyan-500/30 hover:border-cyan-500 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Edit Profile Specs
            </Link>
          </div>
        </div>

        {/* Competitive Tier & XP Progression Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0b1324] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400 shrink-0" />
              <span className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
                LEVEL {tierData.level} — <span className="text-cyan-400">{tierData.tierName}</span>
              </span>
            </div>
            <span className="text-[11px] sm:text-xs font-mono text-slate-400">
              {tierData.currentLevelXp} / {tierData.nextLevelXp} XP (Total: {userXp} XP)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#060b14] h-3 rounded-full overflow-hidden border border-cyan-500/20 p-0.5 shadow-inner">
            <div 
              className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]" 
              style={{ width: `${tierData.progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 sm:p-5 rounded-xl bg-[#0b1324] border border-cyan-500/30 flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.08)] hover:border-cyan-500/60 transition-all">
            <div>
              <p className="text-xs font-mono text-cyan-400/80 mb-1">Highlight Clips</p>
              <h3 className="text-xl sm:text-2xl font-black text-white">{stats.clipsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#0b1324] border border-cyan-500/30 flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.08)] hover:border-cyan-500/60 transition-all">
            <div>
              <p className="text-xs font-mono text-cyan-400/80 mb-1">Squad Lobbies</p>
              <h3 className="text-xl sm:text-2xl font-black text-white">{stats.squadsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#0b1324] border border-cyan-500/30 flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.08)] hover:border-cyan-500/60 transition-all">
            <div>
              <p className="text-xs font-mono text-cyan-400/80 mb-1">LFG Nodes</p>
              <h3 className="text-xl sm:text-2xl font-black text-white">{stats.lfgCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] shrink-0">
              <Radio className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#0b1324] border border-cyan-500/30 flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.08)] hover:border-cyan-500/60 transition-all">
            <div>
              <p className="text-xs font-mono text-cyan-400/80 mb-1">Followers</p>
              <h3 className="text-xl sm:text-2xl font-black text-white">{stats.followersCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#0b1324] border border-cyan-500/30 flex items-center justify-between shadow-[0_0_15px_rgba(6,182,212,0.08)] hover:border-cyan-500/60 transition-all sm:col-span-2 lg:col-span-1">
            <div>
              <p className="text-xs font-mono text-cyan-400/80 mb-1">Following</p>
              <h3 className="text-xl sm:text-2xl font-black text-white">{stats.followingCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Quick Navigation Panel */}
        <div className="p-5 sm:p-6 rounded-xl bg-[#0b1324] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
          <h3 className="text-base sm:text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-cyan-400 shrink-0" /> Ecosystem Navigation Matrix
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/clips" className="p-4 rounded bg-[#060b14] border border-cyan-500/20 hover:border-cyan-500 transition-all flex items-center justify-between group shadow-[0_0_10px_rgba(6,182,212,0.05)]">
              <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-cyan-300">Explore Clips Vault</span>
              <ArrowUpRight className="w-4 h-4 text-cyan-500/60 group-hover:text-cyan-400 transition-colors shrink-0" />
            </Link>
            <Link href="/squads" className="p-4 rounded bg-[#060b14] border border-cyan-500/20 hover:border-cyan-500 transition-all flex items-center justify-between group shadow-[0_0_10px_rgba(6,182,212,0.05)]">
              <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-cyan-300">Squad Directory</span>
              <ArrowUpRight className="w-4 h-4 text-cyan-500/60 group-hover:text-cyan-400 transition-colors shrink-0" />
            </Link>
            <Link href="/lfg" className="p-4 rounded bg-[#060b14] border border-cyan-500/20 hover:border-cyan-500 transition-all flex items-center justify-between group shadow-[0_0_10px_rgba(6,182,212,0.05)]">
              <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-cyan-300">Neural LFG Board</span>
              <ArrowUpRight className="w-4 h-4 text-cyan-500/60 group-hover:text-cyan-400 transition-colors shrink-0" />
            </Link>
            <Link href="/studio" className="p-4 rounded bg-[#060b14] border border-cyan-500/20 hover:border-cyan-500 transition-all flex items-center justify-between group shadow-[0_0_10px_rgba(6,182,212,0.05)]">
              <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-cyan-300">Broadcasting Studio</span>
              <ArrowUpRight className="w-4 h-4 text-cyan-500/60 group-hover:text-cyan-400 transition-colors shrink-0" />
            </Link>
          </div>
        </div>

        {/* Administration Links */}
        <div className="p-4 sm:p-6 rounded-xl bg-[#0b1324] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-white text-xs sm:text-sm truncate">Moderation & Security Clearance</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono truncate">Review flags and ecosystem security reports</p>
            </div>
          </div>
          <Link 
            href="/mod"
            className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer text-center shrink-0"
          >
            Access Mod Hub
          </Link>
        </div>

      </main>
    </div>
  );
}
