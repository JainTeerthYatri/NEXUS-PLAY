"use client";

import Navbar from "@/components/Navbar";
import { ShieldCheck, Mail, Calendar } from "lucide-react";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-6 sm:space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600/10 border border-red-500/30 text-xs font-mono text-red-400 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>LEGAL_FRAMEWORK // COOKIE_POLICY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Cookie Policy for ASTEROID GAMING-CLOUD</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-[11px] sm:text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" /> Effective Date: July 30, 2026
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Platform Name: ASTEROID GAMING-CLOUD</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-red-400 truncate max-w-full">Contact Email: jainteerthyarta@gmail.com</span>
          </div>
        </div>

        {/* Introduction Notice */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-white/10 text-xs sm:text-sm font-mono text-slate-300 leading-relaxed shadow-inner">
          This Cookie Policy explains how ASTEROID GAMING-CLOUD uses cookies and local storage tokens during your visit across our platform, community clips vault, LFG matrix, and live broadcasting studio.
        </div>

        {/* Content Sections */}
        <div className="space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#121216] p-4 sm:p-8 rounded-2xl border border-white/10 shadow-2xl">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">01.</span> What Are Cookies?
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                Cookies are text files placed on your browser to support functional operations, user tracking preferences, and secure session management.
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">02.</span> Cookies and Storage Used by ASTEROID GAMING-CLOUD
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <p>
                Given our technical architecture (<strong className="text-slate-200">Next.js 16</strong>, <strong className="text-slate-200">Supabase SSR</strong>, and secure state management), we utilize the following:
              </p>
              <div className="space-y-2 pl-2 border-l-2 border-red-500/20">
                <p>
                  <strong className="text-slate-200">Authentication & Session Tokens (Strictly Necessary):</strong> Managed via Supabase Auth helpers to keep you logged in across pages like your Creator Dashboard (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">/dashboard</code>), account settings (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">/settings</code>), and moderation views (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">/mod</code>).
                </p>
                <p>
                  <strong className="text-slate-200">Client Local Storage:</strong> Used for saving technical interface preferences (such as dark-mode aesthetics or workspace adjustments).
                </p>
              </div>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">03.</span> Managing Cookies
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <p>
                You can adjust cookie settings directly in your browser. However, disabling strictly necessary authentication cookies will prevent you from logging into your account, maintaining active dashboard sessions, or participating in LFG matchmaking.
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">04.</span> Updates to This Policy
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                We may update this Cookie Policy as our application evolves. Check back periodically for updates.
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">05.</span> Contact Us
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                For any questions regarding our cookie practices, contact:
              </p>
              <div className="pt-2">
                <a 
                  href="mailto:jainteerthyarta@gmail.com" 
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-[11px] sm:text-xs hover:bg-red-900/40 transition-colors shadow-sm break-all"
                >
                  <Mail className="w-4 h-4 shrink-0" /> jainteerthyarta@gmail.com
                </a>
              </div>
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}
