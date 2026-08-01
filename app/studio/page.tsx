"use client";

import Navbar from "@/components/Navbar";
import Link from "next/link";
import { Radio, Video, Terminal, Clock, Lock, UserPlus, ArrowRight } from "lucide-react";

export default function StudioPage() {
  return (
    <div className="min-h-screen bg-[#0b0604] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col justify-center">
        
        {/* Header Section */}
        <div className="mb-8 pb-6 border-b border-orange-500/20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#160b06] border border-orange-500/40 text-xs font-mono text-orange-400 mb-2 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
            <Radio className="w-3.5 h-3.5 text-orange-400" />
            <span>BROADCAST_HUB // MODULE_OFFLINE</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">NEXUS Broadcasting Studio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Professional browser-based broadcasting workspace, WebSocket RTMP streaming bridge, and 16:9 preview canvas.
          </p>
        </div>

        {/* Coming Soon Notice Card */}
        <div className="p-12 rounded-2xl bg-[#160b06] border border-orange-500/40 text-center max-w-2xl mx-auto my-6 space-y-6 shadow-[0_0_30px_rgba(249,115,22,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="w-16 h-16 rounded-xl bg-orange-950/60 border border-orange-500/40 flex items-center justify-center text-orange-400 mx-auto shadow-[0_0_20px_rgba(249,115,22,0.2)]">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded bg-orange-950/80 border border-orange-500/40 text-xs font-mono text-orange-300 uppercase shadow-[0_0_10px_rgba(249,115,22,0.2)]">
              Coming in a New Software Update
            </span>
            <h2 className="text-2xl font-bold text-white">NEXUS Studio & Streaming Pipeline</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Because building the NEXUS Studio integration, FFmpeg process spawning, and real-time WebSocket telemetry requires rigorous architecture, this module is locked and scheduled for release in an upcoming software update.
            </p>
          </div>

          {/* Auth Links /auth/signup & /auth/login */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-5 py-2.5 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.4)] cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Operator Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-5 py-2.5 rounded bg-[#0b0604] hover:bg-orange-950/30 border border-orange-500/30 hover:border-orange-500 text-slate-200 font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(249,115,22,0.1)]"
            >
              <span>Operator Login</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-orange-500/10 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-orange-400" /> STATUS: ARCHITECTURE_IN_PROGRESS
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> TARGET: PATCH_V1.2
            </span>
          </div>
        </div>

      </main>
    </div>
  );
}