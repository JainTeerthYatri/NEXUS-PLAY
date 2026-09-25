"use client";

import Navbar from "@/components/Navbar";
import { ShieldCheck, Mail, Calendar, Clock } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-6 sm:space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600/10 border border-red-500/30 text-xs font-mono text-red-400 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>LEGAL_FRAMEWORK // PRIVACY_FRAMEWORK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-[11px] sm:text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" /> Effective Date: September 2026
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Platform: ASTEROID GAMING-CLOUD</span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#121216] p-4 sm:p-8 rounded-2xl border border-white/10 shadow-2xl">
          
          {/* Section 01 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">01.</span> Information We Collect
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              To provide competitive gaming matchmaking, team coordination, and live broadcasting workspaces, we collect the following categories of data:
            </p>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <p><strong className="text-slate-200">Authentication & Credentials:</strong> Account identifiers and encrypted login credentials processed through Supabase Auth.</p>
              <p><strong className="text-slate-200">Profile & Gamification Data:</strong> Public creator handles (@), display names, bio data, avatar graphics stored in cloud storage buckets, and account level/XP progression counters.</p>
              <p><strong className="text-slate-200">User-Generated Media & Clip Vaults:</strong> Gameplay video reels and media files uploaded to storage buckets, including title metadata and upvote metrics.</p>
              <p><strong className="text-slate-200">Matchmaking & Comms Tables:</strong> Active database tables including squad entries (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">squads</code>, <code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">squad_members</code>), LFG matchmaking vectors (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">lfg_listings</code>, <code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">lfg_participants</code>), encrypted direct messages, and chat rooms.</p>
              <p><strong className="text-slate-200">Nominee Designation (Under Section 14):</strong> Optional representative details configured by the user in Account Settings for account succession or incapacitation.</p>
              <p><strong className="text-slate-200">Technical & Rate-Limiting Telemetry:</strong> Essential session cookies via Supabase SSR and IP metadata processed through Upstash rate-limiters to ensure system stability against bot attacks.</p>
              <p><strong className="text-slate-200">Broadcasting Bridge Signals:</strong> Broadcast states (<code className="text-red-400 font-mono text-[11px] sm:text-xs break-all">is_live</code>) and stream telemetry managed via WebSockets.</p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 02 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">02.</span> Lawful Grounds for Processing (Section 4 & Section 6)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              Personal data processing operates strictly pursuant to statutory requirements:
            </p>
            <ul className="list-disc list-inside text-slate-400 pl-3 sm:pl-5 space-y-1.5">
              <li><strong>Affirmative User Consent:</strong> Supplied explicitly when creating your operator credentials.</li>
              <li><strong>Legitimate Technical Necessity:</strong> Running user sessions, enforcing platform access hierarchy (Member, Mod, Owner), and system security.</li>
            </ul>
          </section>

          <hr className="border-white/5" />

          {/* Section 03 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">03.</span> Infrastructure Security & Limitation of Platform Liability
            </h2>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400 leading-relaxed">
              <p>
                We enforce database protection protocols, including strict <strong className="text-slate-200">Row Level Security (RLS)</strong> policies on relational PostgreSQL schemas and authenticated access barriers to prevent unauthorized tampering.
              </p>
              <p className="p-3.5 rounded-xl bg-black/50 border border-white/10 text-slate-300">
                <strong className="text-white block mb-1">Disclaimer of Technical Liability & Assumption of Risk:</strong>
                While we deploy standard database-level security and RLS safeguards, digital transmissions over the internet, client-side compromises, shared credential leaks, or hardware vulnerabilities outside our direct server controls remain the sole responsibility and risk of the user. The platform provides access on an &quot;as-is&quot; basis and disclaims legal and financial liability for data breaches resulting from user actions, device malware, unauthorized credential sharing, or force majeure events.
              </p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 04 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">04.</span> Enforceable Rights (Section 11, Section 12 & Section 14)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              Subject to applicable legal statutory provisions, users possess the following rights:
            </p>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>• <strong>Right of Access (Section 11):</strong> Directly view all active telemetry, squad memberships, and profile metrics on your <Link href="/dashboard" className="text-red-400 underline">Dashboard</Link>.</p>
              <p>• <strong>Right to Correction & Erasure (Section 12):</strong> Update incomplete specs or initiate complete profile erasure and media purging through the Danger Zone in <Link href="/settings" className="text-red-400 underline">Account Settings</Link>.</p>
              <p>• <strong>Right to Nominate (Section 14):</strong> Specify an authorized individual in Account Settings to manage your digital records in event of death or incapacity.</p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 05 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">05.</span> Protection of Minors (Section 9)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              In accordance with Section 9 statutory provisions, we do not knowingly process personal data of individuals under 18 years without verifiable parental consent, nor do we run behavioral profiling or targeted advertising directed at minors.
            </p>
          </section>

          <hr className="border-white/5" />

          {/* Section 06 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">06.</span> Grievance Redressal (Section 13)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              Statutory inquiries, privacy concerns, or data rights requests can be directed to the platform authority:
            </p>
            
            <div className="ml-3 sm:ml-5 p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono">
              <p className="text-slate-200"><strong>Designated Authority:</strong> Platform Owner & Data Protection Desk</p>
              <p className="text-slate-200"><strong>Platform Name:</strong> ASTEROID GAMING-CLOUD</p>
              <p className="text-slate-200"><strong>Jurisdiction / Location:</strong> Loni, Ghaziabad, Uttar Pradesh, India</p>
              <p className="text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                <strong>Statutory Resolution Timeline:</strong> Addressed within statutory limits (30 days) under Section 13
              </p>
              <div className="pt-2">
                <a 
                  href="mailto:jainteerthyarta@gmail.com" 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/40 transition-colors break-all"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" /> jainteerthyarta@gmail.com
                </a>
              </div>
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}