"use client";

import { useState } from "react";
import { ShieldAlert, LogOut, Mail, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function BannedPage() {
  const [erasing, setErasing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          moderator_id: user.id,
          action_type: "SESSION_DISCONNECT_BANNED",
          target_id: user.id,
          details: `Banned user ${user.email || user.id} disconnected their session from the ban page.`[cite: 7]
        });
      }
    } catch (err) {
      console.error("Failed to insert log on disconnect:", err);[cite: 7]
    }

    // Clean up local client seeds
    if (typeof window !== "undefined") {
      localStorage.removeItem("nexus_client_entropy");
      localStorage.removeItem("asteroid_chat_device_secret");
    }

    await supabase.auth.signOut();[cite: 7]
    router.push("/");[cite: 7]
  }

  // Account and telemetry erasure under Section 12
  async function handleRequestErasure() {
    const confirmErase = confirm(
      "Confirm permanent account and personal data erasure under Section 12? All your clips, squad memberships, and profile records will be permanently removed."
    );
    if (!confirmErase) return;

    setErasing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session found.");

      // Cascade remove user telemetry records
      await supabase.from("clips").delete().eq("user_id", user.id);
      await supabase.from("squad_members").delete().eq("user_id", user.id);
      await supabase.from("lfg_participants").delete().eq("user_id", user.id);
      await supabase.from("lfg_listings").delete().eq("user_id", user.id);

      await supabase.from("audit_logs").insert({
        moderator_id: user.id,
        action_type: "BANNED_USER_ERASURE",
        target_id: user.id,
        details: `Suspended user ${user.id} executed permanent data erasure under Section 12.`,
      });

      await supabase.from("profiles").delete().eq("id", user.id);

      if (typeof window !== "undefined") {
        localStorage.removeItem("nexus_client_entropy");
        localStorage.removeItem("asteroid_chat_device_secret");
      }

      await supabase.auth.signOut();
      alert("Your account records and associated personal telemetry have been permanently deleted.");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      alert("Erasure request failed: " + (err.message || "Unknown error"));
      setErasing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#121216] border border-red-500/40 text-center shadow-[0_0_30px_rgba(239,68,68,0.2)] my-auto space-y-5">
        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-red-600/10 border border-red-500/30 text-red-500 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />[cite: 7]
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white mb-1 tracking-tight">ACCESS TERMINATED</h1>[cite: 7]
          <p className="text-[11px] sm:text-xs font-mono text-red-400 uppercase tracking-wider">
            Security Clearance Revoked // Account Banned[cite: 7]
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed px-1">
          Your operator profile has been suspended by the Command Center moderation team due to a violation of platform protocols or community guidelines.[cite: 7]
        </p>

        {/* Administrative Inquiries Channel (Section 13) */}
        <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-left text-xs font-mono space-y-1.5">
          <span className="text-slate-400 block text-[10px] uppercase font-bold text-red-400">
            Administrative Appeal & Inquiries (Section 13)
          </span>
          <p className="text-slate-300 text-[11px]">
            To appeal your suspension or contact the administrative desk:
          </p>
          <a
            href="mailto:jainteerthyarta@gmail.com"
            className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 underline break-all"
          >
            <Mail className="w-3.5 h-3.5 shrink-0" /> jainteerthyarta@gmail.com
          </a>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono tracking-wider transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> DISCONNECT SESSION[cite: 7]
          </button>

          <button
            onClick={handleRequestErasure}
            disabled={erasing}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white font-mono text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>{erasing ? "ERASING RECORDS..." : "Request Data Erasure (Section 12)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}