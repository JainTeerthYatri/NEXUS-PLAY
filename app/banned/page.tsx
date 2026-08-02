"use client";

import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function BannedPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#121216] border border-red-500/40 text-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">ACCESS TERMINATED</h1>
        <p className="text-xs font-mono text-red-400 mb-6 uppercase tracking-wider">
          Security Clearance Revoked // Account Banned
        </p>
        <p className="text-sm text-slate-300 mb-8 leading-relaxed">
          Your operator profile has been suspended by the Command Center moderation team due to a violation of platform protocols or community guidelines.
        </p>
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono tracking-wider transition-colors cursor-pointer shadow-lg"
        >
          DISCONNECT SESSION
        </button>
      </div>
    </div>
  );
}
