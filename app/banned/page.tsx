"use client";

import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function BannedPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          moderator_id: user.id,
          action_type: "SESSION_DISCONNECT_BANNED",
          target_id: user.id,
          details: `Banned user ${user.email || user.id} disconnected their session from the ban page.`
        });
      }
    } catch (err) {
      console.error("Failed to insert log on disconnect:", err);
    }

    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#121216] border border-red-500/40 text-center shadow-[0_0_30px_rgba(239,68,68,0.2)] my-auto">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">ACCESS TERMINATED</h1>
        <p className="text-[11px] sm:text-xs font-mono text-red-400 mb-5 sm:mb-6 uppercase tracking-wider px-2">
          Security Clearance Revoked // Account Banned
        </p>
        <p className="text-xs sm:text-sm text-slate-300 mb-6 sm:mb-8 leading-relaxed px-1">
          Your operator profile has been suspended by the Command Center moderation team due to a violation of platform protocols or community guidelines.
        </p>
        <button
          onClick={handleLogout}
          className="w-full py-3.5 sm:py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono tracking-wider transition-colors cursor-pointer shadow-lg"
        >
          DISCONNECT SESSION
        </button>
      </div>
    </div>
  );
}
