"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addOperatorXp } from "@/utils/leveling";
import { UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId: string;
  initialIsFollowing?: boolean;
}

export default function FollowButton({ targetUserId, currentUserId, initialIsFollowing = false }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleFollowToggle() {
    if (!currentUserId || currentUserId === targetUserId) return;
    setLoading(true);

    if (isFollowing) {
      // Unfollow logic
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (!error) {
        setIsFollowing(false);
      }
    } else {
      // Follow logic
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });

      if (!error) {
        setIsFollowing(true);
        // Reward +5 XP to the user who performed the follow action
        await addOperatorXp(currentUserId, 5);
      }
    }

    setLoading(false);
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading || !currentUserId}
      className={`px-4 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
        isFollowing
          ? "bg-[#0b1324] border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
          : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
      }`}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5" />
          <span>FOLLOWING</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          <span>FOLLOW</span>
        </>
      )}
    </button>
  );
}