"use client";

import Navbar from "@/components/Navbar";
import { ShieldCheck, Mail, Calendar, Clock } from "lucide-react";

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
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Cookie Policy</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-[11px] sm:text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" /> Effective Date: September 2026
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Platform: ASTEROID GAMING-CLOUD</span>
          </div>
        </div>

        {/* Introduction Notice */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-white/10 text-xs sm:text-sm font-mono text-slate-300 leading-relaxed shadow-inner">
          This Cookie Policy details the functional tokens, local storage elements, and network identifiers deployed across our community clips vault, LFG matrix, and live broadcasting studio.
        </div>

        {/* Content Sections */}
        <div className="space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#121216] p-4 sm:p-8 rounded-2xl border border-white/10 shadow-2xl">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">01.</span> Technical Scope
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                Cookies and local storage tokens are technical identifiers placed within your browser to enable authenticated routing, role-based security clearance, and persistent operator sessions[cite: 5].
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">02.</span> Essential Storage and Session Handling (Section 4 & Section 6)
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <p>
                Our infrastructure (Next.js, Supabase SSR, and state management) relies exclusively on strictly necessary functional identifiers[cite: 5]:
              </p>
              <div className="space-y-2 pl-2 border-l-2 border-red-500/20">
                <p>
                  <strong className="text-slate-200">Authentication & Session Tokens (Strictly Necessary):</strong> Handled via Supabase Auth cookies to maintain active operator sessions across the Control Center (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">/dashboard</code>), account configurations (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">/settings</code>), and administrative views (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">/mod</code>)[cite: 5].
                </p>
                <p>
                  <strong className="text-slate-200">Security Rate-Limiting Records:</strong> Transient request markers analyzed via Upstash Redis to prevent automated bot flooding and credential attacks[cite: 4, 5].
                </p>
                <p>
                  <strong className="text-slate-200">Local Browser Storage:</strong> Retains client-side UI configurations, theme settings, and device encryption seeds directly on your hardware without cross-site tracking[cite: 5].
                </p>
              </div>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">03.</span> Infrastructure Security & Limitation of Liability
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400 leading-relaxed">
              <p>
                All session tokens are protected through standard database Row Level Security (RLS) constraints and server-authenticated checks[cite: 4, 5].
              </p>
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-slate-300">
                <strong className="text-white block mb-1">User Responsibility & Limitation of Technical Liability:</strong>
                Users are solely responsible for safeguarding their devices, local browsers, and network connections. The platform disclaims legal and financial liability for any unauthorized session hijacking, token compromise, or account breach arising from third-party browser extensions, unpatched client software, local malware, or credential sharing outside the platform&apos;s direct server infrastructure.
              </div>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">04.</span> Managing Cookies
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <p>
                You may clear or restrict cookies directly via your browser preferences[cite: 5]. However, because our tokens are strictly functional and required to authenticate access across squads and matchmaking, disabling them will prevent you from signing in or using protected platform features[cite: 5].
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">05.</span> Inquiries and Administrative Desk (Section 13)
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <p>
                For technical questions or data storage inquiries, contact the administrative desk[cite: 5]:
              </p>
              
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono">
                <p className="text-slate-200"><strong>Designated Authority:</strong> Platform Owner & Technical Administration</p>
                <p className="text-slate-200"><strong>Platform:</strong> ASTEROID GAMING-CLOUD</p>
                <p className="text-slate-200"><strong>Location:</strong> Loni, Ghaziabad, Uttar Pradesh, India</p>
                <p className="text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-400" />
                  <strong>Statutory Resolution SLA:</strong> Addressed within 30 days under Section 13
                </p>
                <div className="pt-2">
                  <a 
                    href="mailto:jainteerthyarta@gmail.com" 
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/40 transition-colors shadow-sm break-all"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" /> jainteerthyarta@gmail.com[cite: 5]
                  </a>
                </div>
              </div>
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}