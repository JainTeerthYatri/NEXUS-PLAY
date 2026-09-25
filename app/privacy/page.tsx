"use client";

import Navbar from "@/components/Navbar";
import { ShieldCheck, Mail, Calendar, Clock, UserCheck, Trash2, Shield, Lock } from "lucide-react";
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
            <span>LEGAL_FRAMEWORK // DPDP_COMPLIANCE_POLICY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-[11px] sm:text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" /> Effective Date: September 2026
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Platform: ASTEROID GAMING-CLOUD</span>
            <span className="hidden sm:inline">•</span>
            <span className="text-emerald-400 font-bold">DPDP Act, 2023 Compliant</span>
          </div>
        </div>

        {/* Introduction Notice */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-white/10 text-xs sm:text-sm font-mono text-slate-300 leading-relaxed shadow-inner">
          Welcome to ASTEROID GAMING-CLOUD (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We process digital personal data in strict accordance with the **Digital Personal Data Protection (DPDP) Act, 2023**. This policy explains how your digital personal information is collected, used, protected, and how you can exercise your statutory rights as a Data Principal.
        </div>

        {/* Content Sections */}
        <div className="space-y-6 sm:space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#121216] p-4 sm:p-8 rounded-2xl border border-white/10 shadow-2xl">
          
          {/* Section 01 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">01.</span> Categories of Personal Data Collected
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              Under the principle of purpose limitation and data minimization, we collect only digital personal data necessary to provide platform features:
            </p>
            <div className="pl-3 sm:pl-5 space-y-3 text-slate-400">
              <p><strong className="text-slate-200">Account Credentials:</strong> Email addresses and encrypted session tokens managed securely via Supabase Auth.</p>
              <p><strong className="text-slate-200">Operator Profile:</strong> Usernames (@), display names, bio descriptions, avatar images, and internal progression stats.</p>
              <p><strong className="text-slate-200">Gaming & Matchmaking Telemetry:</strong> Squad memberships, LFG lobby listings, and real-time chat transmissions.</p>
              <p><strong className="text-slate-200">Nominee Information (Section 14):</strong> Optional nominee name and contact email designated by you in Account Settings to manage rights in case of death or incapacity.</p>
              <p><strong className="text-slate-200">Essential Technical Data:</strong> Strictly necessary first-party authentication cookies and IP rate-limiting logs (via Upstash Redis) to prevent brute-force attacks and ensure platform stability.</p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 02 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">02.</span> Grounds for Processing (Section 4 & 6)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              Your personal data is processed strictly on lawful grounds:
            </p>
            <ul className="list-disc list-inside text-slate-400 pl-3 sm:pl-5 space-y-1.5">
              <li><strong>Free and Affirmative Consent:</strong> Granted by you upon registering an operator profile.</li>
              <li><strong>Legitimate Uses:</strong> Operating essential user authentication, session security, and preventing cyber intrusions.</li>
            </ul>
          </section>

          <hr className="border-white/5" />

          {/* Section 03 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">03.</span> Rights of Data Principals (Sections 11–14)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              As an authorized Data Principal, you have the following enforceable statutory rights:
            </p>
            <div className="pl-3 sm:pl-5 space-y-2 text-slate-400">
              <p>• <strong>Right to Access:</strong> View all your active profile data, stats, and telemetry in your <Link href="/dashboard" className="text-red-400 underline">Dashboard</Link>.</p>
              <p>• <strong>Right to Correction:</strong> Rectify outdated, inaccurate, or incomplete information anytime in <Link href="/settings" className="text-red-400 underline">Account Settings</Link>.</p>
              <p>• <strong>Right to Erasure (Deletion):</strong> Permanently delete your operator profile, highlight clips, and all personal telemetry via the Account Settings Danger Zone.</p>
              <p>• <strong>Right to Nominate:</strong> Appoint a trusted representative in Account Settings to exercise your data rights in unforeseen circumstances.</p>
            </div>
          </section>

          <hr className="border-white/5" />

          {/* Section 04 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">04.</span> Protection of Children&apos;s Data (Section 9)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              We strictly comply with child protection mandates under Section 9 of the DPDP Act. We do not knowingly process personal data of children under 18 years without verifiable parental consent, nor do we perform behavioral tracking, profiling, or targeted advertising directed at minors.
            </p>
          </section>

          <hr className="border-white/5" />

          {/* Section 05 */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">05.</span> Data Storage, Security & Retention (Section 8)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              Your information is secured via PostgreSQL Row Level Security (RLS) policies, client-side encryption, and strict rate limits. Personal data is retained only for the duration necessary to satisfy operational needs or until an account erasure request is executed.
            </p>
          </section>

          <hr className="border-white/5" />

          {/* Section 06: Grievance Redressal Officer */}
          <section className="space-y-3">
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">06.</span> Grievance Redressal & Contact Officer (Section 13)
            </h2>
            <p className="text-slate-400 pl-3 sm:pl-5">
              In accordance with DPDP Act requirements, any data concerns, questions, or complaints can be lodged directly with our designated Grievance Redressal Authority:
            </p>
            
            <div className="ml-3 sm:ml-5 p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono">
              <p className="text-slate-200"><strong>Designated Authority / Role:</strong> Platform Owner & Data Protection Cell</p>
              <p className="text-slate-200"><strong>Platform Organization:</strong> ASTEROID GAMING-CLOUD</p>
              <p className="text-slate-200"><strong>Official Jurisdiction / Location:</strong> Loni, Ghaziabad, Uttar Pradesh, India</p>
              <p className="text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                <strong>Statutory Resolution SLA:</strong> Within 30 days of grievance receipt
              </p>
              <div className="pt-2">
                <a 
                  href="mailto:jainteerthyarta@gmail.com" 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/40 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" /> jainteerthyarta@gmail.com
                </a>
              </div>
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}