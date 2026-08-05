"use client";

import Navbar from "@/components/Navbar";
import { ShieldCheck, Mail, Calendar } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-6 sm:space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600/10 border border-red-500/30 text-xs font-mono text-red-400 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>LEGAL_FRAMEWORK // COMPLIANCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Comprehensive Terms and Conditions for ASTEROID GAMING-CLOUD</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-[11px] sm:text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" /> Effective Date: July 30, 2026[cite: 8]
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Platform Name: ASTEROID GAMING-CLOUD[cite: 8]</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-red-400 break-all">Contact Email: jainteerthyarta@gmail.com[cite: 8]</span>
          </div>
        </div>

        {/* Introduction Notice */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-white/10 text-xs sm:text-sm font-mono text-slate-300 leading-relaxed shadow-inner">
          Please read these Terms and Conditions (&quot;Terms&quot;) carefully before using ASTEROID GAMING-CLOUD. By accessing the website, utilizing the broadcasting studio (/studio), or interacting with our community features, you agree to these Terms[cite: 8].
        </div>

        {/* Content Sections */}
        <div className="space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#121216] p-4 sm:p-8 rounded-2xl border border-white/10 shadow-2xl">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">01.</span> Acceptance and Free Service Scope
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                ASTEROID GAMING-CLOUD is provided to users completely free of charge as a community-driven ecosystem. By accessing the platform, you confirm that you satisfy all statutory age restrictions applicable in your region[cite: 8].
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">02.</span> User Accounts, Security & Fair Usage
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                You are responsible for safeguarding your login credentials managed through <strong className="text-slate-200">Supabase Auth</strong>[cite: 8].
              </p>
              <p>
                You agree not to bypass security controls, abuse platform APIs, or exceed request thresholds managed by our security and rate-limiting systems (such as <strong className="text-slate-200">Upstash</strong>)[cite: 8].
              </p>
              <p>
                Automated bot scraping, exploitation of WebSocket servers, or malicious attacks on our infrastructure are strictly prohibited and will result in immediate account termination[cite: 8].
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">03.</span> User-Generated Content, Media & Storage Buckets
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <div>
                <strong className="text-slate-200 block mb-1">Ownership:</strong>
                <p>
                  You retain ownership of content you upload (such as avatar images in the <code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">avatars</code> storage bucket, highlight videos in the <code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">clips</code> storage bucket, squad details, and real-time chat payloads), granting ASTEROID GAMING-CLOUD a non-exclusive license to display them within the platform ecosystem[cite: 8].
                </p>
              </div>
              <div>
                <strong className="text-slate-200 block mb-1">Prohibited Content:</strong>
                <p>
                  You must not upload or share explicit, harmful, hateful, fraudulent, or copyrighted content that violates local or international laws[cite: 8].
                </p>
              </div>
              <div>
                <strong className="text-slate-200 block mb-1">Moderation & Reports:</strong>
                <p>
                  Any user or content can be flagged via our reporting system (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">moderation_reports</code>). Platform administrators and moderators hold the absolute right to remove violating clips, chat entries, squad listings, or LFG nodes without prior notice[cite: 8].
                </p>
              </div>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">04.</span> Live Broadcasting & Streaming Pipeline (/studio)
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                ASTEROID GAMING-CLOUD integrates a custom Node.js, WebSocket, and FFmpeg streaming utility that permits live transcoding and RTMP forwarding to external destinations and endpoints (such as YouTube)[cite: 8].
              </p>
              <p>
                You are solely legally responsible for all audio-visual material broadcasted through your studio session and must ensure complete compliance with third-party platform rules and copyright guidelines[cite: 8].
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">05.</span> Disclaimer of Warranties & Data Leak Disclaimer
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <p>
                ASTEROID GAMING-CLOUD is provided on an <strong className="text-slate-200">&quot;as-is&quot;</strong> and <strong className="text-slate-200">&quot;as-available&quot;</strong> basis. We provide no warranties regarding absolute server uptime, real-time message delivery speed, video transcoding performance, or permanent data retention[cite: 8].
              </p>
              <p>
                <strong className="text-red-400">Data Breach & Leak Disclaimer:</strong> While we implement standard enterprise security measures (such as Row Level Security and encrypted auth tokens via Supabase), <strong className="text-slate-200">ASTEROID GAMING-CLOUD and its creators are NOT responsible or liable for any data leaks, security breaches, unauthorized database access, or compromise of user information</strong> resulting from malicious cyber-attacks, zero-day vulnerabilities, third-party cloud infrastructure failures (such as Supabase or Vercel), or user negligence in managing credentials[cite: 8].
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">06.</span> Limitation of Liability
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                To the maximum extent permitted by applicable law, ASTEROID GAMING-CLOUD and its creators shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from your use of the platform, community interactions, squad matchmaking, data exposures, or live streaming tools[cite: 8].
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">07.</span> Updates to Terms
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                We reserve the right to amend, modify, or update these Terms at any time without individual direct notice. Continued use of the platform after updates indicates your explicit agreement to the latest revised version[cite: 8].
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">08.</span> Contact Information
            </h2>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>
                For legal inquiries, copyright takedown requests, or support issues, reach out directly to our administrative team[cite: 8]:
              </p>
              <div className="pt-2">
                <a 
                  href="mailto:jainteerthyarta@gmail.com" 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-[11px] sm:text-xs hover:bg-red-900/40 transition-colors shadow-sm break-all"
                >
                  <Mail className="w-4 h-4 shrink-0" /> jainteerthyarta@gmail.com[cite: 8]
                </a>
              </div>
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}
