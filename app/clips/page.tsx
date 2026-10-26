"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import OrigamiPage from "@/components/OrigamiPage";
import { createClient } from "@/lib/supabase/client";
import { Trophy, ThumbsUp, Plus, Flame, Trash2, ShieldAlert } from "lucide-react";

type Clip = {
  id: string;
  user_id: string;
  title: string;
  game_title: string;
  video_url?: string;
  embed_url?: string;
  upvotes_count: number;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
    role?: string;
  };
};

export default function ShortsFeedPage() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profileData?.role) {
          setUserRole(profileData.role);
        }
      }

      fetchClips();
    }

    init();
  }, [supabase]);

  async function fetchClips() {
    const { data, error } = await supabase
      .from("clips")
      .select("*, profiles(username, display_name, role)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setClips(data);
    }
    setLoading(false);
  }

  async function handleUpvote(clipId: string, clipUserId: string, currentUpvotes: number) {
    if (!user) {
      alert("Please log in to upvote short reels.");
      return;
    }

    if (user.id === clipUserId) {
      setActionMessage("ACCESS_DENIED: You cannot upvote your own short telemetry!");
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }

    const { error } = await supabase.rpc('increment_upvote', { clip_id: clipId });

    if (!error) {
      const newCount = (currentUpvotes || 0) + 1;
      setClips(clips.map(c => c.id === clipId ? { ...c, upvotes_count: newCount } : c));
    } else {
      console.error("Upvote error:", error.message);
      setActionMessage("ERROR: Failed to register upvote.");
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  async function handleDeleteClip(clipId: string, clipUserId: string) {
    const isOwner = user && user.id === clipUserId;
    const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

    if (!isOwner && !isOwnerOrAdmin) {
      setActionMessage("ACCESS_DENIED: Unauthorized deletion attempt.");
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }

    const confirmMsg = isOwnerOrAdmin && !isOwner 
      ? "[OWNER/ADMIN OVERRIDE] Are you sure you want to delete this short?" 
      : "Are you sure you want to delete this short reel?";

    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from("clips")
      .delete()
      .eq("id", clipId);

    if (!error) {
      setClips(clips.filter(c => c.id !== clipId));
      setActionMessage("SUCCESS: Short telemetry purged from database.");
      setTimeout(() => setActionMessage(null), 3000);

      // ── LOGGING SYSTEM INTEGRATION ──
      if (user) {
        try {
          await supabase.from("audit_logs").insert({
            moderator_id: user.id,
            action_type: isOwnerOrAdmin && !isOwner ? "ADMIN_DELETE_CLIP" : "DELETE_CLIP",
            target_id: clipId,
            details: `Clip (ID: ${clipId}) was deleted by user/admin ${user.email || user.id}.`
          });
        } catch (logErr) {
          console.error("Failed to insert clip deletion audit log:", logErr);
        }
      }
      // ────────────────────────────────
    } else {
      console.error("Delete error:", error.message);
      setActionMessage("ERROR: Failed to delete clip.");
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  return (
    <OrigamiPage enter="auto" exit="fold" bg="#060b14" colors={["#0e7490", "#06b6d4", "#67e8f9", "#f43f5e"]}>
    <div className="h-[100dvh] bg-[#060b14] text-slate-100 flex flex-col overflow-hidden">
      <Navbar />

      {/* Floating Warning/Action Message */}
      {actionMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 p-3 rounded-lg bg-cyan-950/90 border border-cyan-500/50 text-xs font-mono text-cyan-300 text-center shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse max-w-[90%] sm:max-w-md">
          {actionMessage}
        </div>
      )}

      {/* Main Reels Container with Scroll Snap - Fully Responsive Across Mobile, Tablet, Laptop, and PC */}
      <main className="flex-1 h-[calc(100dvh-65px)] overflow-y-scroll snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative">
        
        {loading ? (
          <div className="flex items-center justify-center h-full text-cyan-400 font-mono text-sm animate-pulse">
            LOADING_SHORTS_STREAM...
          </div>
        ) : clips.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4 sm:p-6">
            <div className="p-8 sm:p-12 rounded-2xl bg-[#0b1324] border border-cyan-500/30 text-center max-w-md w-full shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <Trophy className="w-10 h-10 text-cyan-500/60 mx-auto mb-4" />
              <h3 className="text-white font-bold mb-1 text-sm sm:text-base">No Shorts Deployed Yet</h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-6 font-mono">
                The network shorts feed is empty. Share your highlight now.
              </p>
              {user && (
                <Link href="/clips/upload" className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs inline-block uppercase tracking-wider transition-all">
                  Upload First Short
                </Link>
              )}
            </div>
          </div>
        ) : (
          clips.map((clip) => {
            const videoSource = clip.video_url || clip.embed_url;
            const isOwner = user && user.id === clip.user_id;
            const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
            const canDelete = isOwner || isOwnerOrAdmin;

            return (
              <div 
                key={clip.id} 
                className="w-full h-full snap-start snap-always flex items-center justify-center p-2 sm:p-4 md:p-6"
              >
                <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md h-full max-h-[720px] sm:max-h-[780px] bg-[#0b1324] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.12)] flex flex-col">
                  
                  {/* Creator Info Header */}
                  <div className="absolute top-0 inset-x-0 z-10 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-[#060b14]/95 via-[#060b14]/60 to-transparent">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-mono text-xs text-cyan-400 font-bold shrink-0">
                        {(clip.profiles?.username || "OP").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-mono font-bold text-white drop-shadow truncate max-w-[120px] sm:max-w-[160px]">
                            @{clip.profiles?.username || "operator"}
                          </h4>
                          {clip.profiles?.role && clip.profiles.role !== 'user' && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-[9px] font-mono text-cyan-400 uppercase border border-cyan-500/30 shrink-0">
                              {clip.profiles.role}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-300">
                          {new Date(clip.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 sm:px-2.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 uppercase shadow truncate max-w-[90px] sm:max-w-[120px]">
                        {clip.game_title}
                      </span>

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteClip(clip.id, clip.user_id)}
                          title={isOwnerOrAdmin && !isOwner ? "Owner/Admin Delete Override" : "Delete Short"}
                          className="p-1.5 rounded bg-red-950/70 hover:bg-red-900/90 border border-red-500/50 text-red-400 transition-colors cursor-pointer flex items-center gap-1 shadow shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {isOwnerOrAdmin && !isOwner && (
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Vertical Short Video Player Container - object-contain used to prevent cutting */}
                  <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                    {videoSource ? (
                      <video 
                        src={videoSource} 
                        controls 
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs font-mono text-slate-500">NO_TELEMETRY_STREAM</div>
                    )}
                  </div>

                  {/* Short Details & Upvote Action Footer */}
                  <div className="absolute bottom-0 inset-x-0 z-10 p-3 sm:p-5 flex items-center justify-between bg-gradient-to-t from-[#060b14]/95 via-[#060b14]/75 to-transparent gap-2">
                    <div className="min-w-0 pr-2">
                      <h3 className="font-bold text-white text-xs sm:text-sm md:text-base tracking-wide mb-0.5 drop-shadow truncate">
                        {clip.title}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-300 font-mono">
                        Short Telemetry Feed
                      </p>
                    </div>

                    <button 
                      onClick={() => handleUpvote(clip.id, clip.user_id, clip.upvotes_count)}
                      className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.25)] active:scale-95 backdrop-blur-sm shrink-0"
                    >
                      <ThumbsUp className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{clip.upvotes_count || 0}</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}

      </main>
    </div>
    </OrigamiPage>
  );
}