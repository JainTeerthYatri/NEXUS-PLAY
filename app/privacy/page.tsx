"use client";

import Navbar from "@/components/Navbar";
import { ShieldCheck, Mail, Calendar } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-600/10 border border-red-500/30 text-xs font-mono text-red-400 mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>LEGAL_FRAMEWORK // PRIVACY_POLICY</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
          <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" /> Effective Date: July 30, 2026
            </span>
            <span>•</span>
            <span>Platform: ASTEROID GAMING-CLOUD</span>
          </div>
        </div>

        {/* Introduction Notice */}
        <div className="p-4 rounded-xl bg-[#121216] border border-white/10 text-xs font-mono text-slate-300 leading-relaxed">
          Welcome to ASTEROID GAMING-CLOUD (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring that your personal information is handled safely. This Privacy Policy details how we collect, use, store, and secure your data across our Next.js platform, database schemas, storage buckets, and real-time streaming tools.
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-[#121216] p-8 rounded-2xl border border-white/10 shadow-2xl">
          
          <section className="space-y-3">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">01.</span> Information We Collect
            </h2>
            <p className="text-slate-400 pl-5">
              To provide a complete competitive gaming, matchmaking, and broadcasting experience, we collect the following categories of information:
            </p>
            <div className="pl-5 space-y-3 text-slate-400">
              <p><strong className="text-slate-200">Authentication & Credentials:</strong> Account credentials and secure login identifiers processed through Supabase Auth.</p>
              <p><strong className="text-slate-200">Profile & Gamification Data:</strong> Public creator profiles including your unique username (@), display name, bio, gaming roles, profile avatar images stored in our cloud storage buckets, and internal gamification metrics such as your account level and XP tracking.</p>
              <p><strong className="text-slate-200">User-Generated Content & Media Vaults:</strong> Highlight videos and media files uploaded to our clips storage buckets, along with video metadata, titles, game titles, and upvote counters.</p>
              <p><strong className="text-slate-200">Matchmaking & Community Interactions:</strong> Information from our active tables including squad creation data (<code className="text-red-400 font-mono text-xs">squads</code>, <code className="text-red-400 font-mono text-xs">squad_members</code>), Neural LFG Matrix listings (<code className="text-red-400 font-mono text-xs">lfg_listings</code>, <code className="text-red-400 font-mono text-xs">lfg_participants</code>), real-time lobby chat logs (<code className="text-red-400 font-mono text-xs">chat_messages</code>, <code className="text-red-400 font-mono text-xs">global_chat</code>), and social follower links (<code className="text-red-400 font-mono text-xs">follows</code>).</p>
              <p><strong className="text-slate-200">Technical, Security & Telemetry Data:</strong> IP addresses, browser cookies, session identifiers via Supabase SSR, and security metadata processed through our rate-limiting infrastructure (such as Upstash) to prevent spam, bot attacks, and ensure platform stability.</p>
              <p><strong className="text-slate-200">Live Broadcasting Metadata:</strong> Stream keys, broadcast statuses (<code className="text-red-400 font-mono text-xs">is_live</code>), and technical session inputs processed through our WebSocket/FFmpeg streaming bridge.</p>
            </div>
          </section>

          <hr className="border-white/5" />

          <section className="space-y-3">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">02.</span> How We Use Your Information
            </h2>
            <p className="text-slate-400 pl-5">
              We use your information strictly for platform operations, including:
            </p>
            <ul className="list-disc list-inside text-slate-400 pl-5 space-y-1.5">
              <li>Managing user registration, authentication states, and secure role-based access (<code className="text-red-400 font-mono text-xs">user</code>, <code className="text-red-400 font-mono text-xs">mod</code>, <code className="text-red-400 font-mono text-xs">owner</code>).</li>
              <li>Displaying public creator profiles, active gaming squads, and community highlight clips.</li>
              <li>Powering real-time features like LFG matchmaking nodes, global chat channels, and live broadcast indicator rings.</li>
              <li>Processing moderation reports (<code className="text-red-400 font-mono text-xs">moderation_reports</code>) to review flagged content, investigate violations, and maintain community safety.</li>
            </ul>
          </section>

          <hr className="border-white/5" />

          <section className="space-y-2">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">03.</span> Data Storage, Security & Infrastructure
            </h2>
            <p className="text-slate-400 pl-5">
              Your data is stored securely using cloud-hosted PostgreSQL relational databases and cloud storage buckets (avatars and clips). We implement strict Row Level Security (RLS) policies and rate-limiting frameworks to ensure unauthorized users cannot alter or access protected records.
            </p>
          </section>

          <hr className="border-white/5" />

          <section className="space-y-3">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">04.</span> Age Restrictions & Statutory Privacy Compliance
            </h2>
            <p className="text-slate-400 pl-5">
              ASTEROID GAMING-CLOUD strictly complies with statutory age restriction laws and government digital privacy regulations.
            </p>
            <ul className="list-disc list-inside text-slate-400 pl-5 space-y-1.5">
              <li>Users must meet the minimum legal age limit mandated by their local jurisdiction to register an account and use this platform.</li>
              <li>Individuals below the legal age of digital consent may only use the platform under parental or legal guardian supervision. We do not knowingly collect personal data from minors without adhering to applicable statutory consent frameworks.</li>
            </ul>
          </section>

          <hr className="border-white/5" />

          <section className="space-y-2">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">05.</span> Cookies and Local Storage
            </h2>
            <p className="text-slate-400 pl-5">
              We utilize essential session cookies and browser local storage via Supabase Auth to maintain user logins and interface preferences.
            </p>
          </section>

          <hr className="border-white/5" />

          <section className="space-y-2">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <span className="text-red-500 font-mono text-xs">06.</span> Contact Us
            </h2>
            <p className="text-slate-400 pl-5">
              For any privacy-related inquiries, data requests, or compliance concerns, contact us at:
            </p>
            <div className="pl-5 pt-1">
              <a href="mailto:jainteerthyarta@gmail.com" className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-xs hover:bg-red-900/40 transition-colors">
                <Mail className="w-3.5 h-3.5" /> jainteerthyarta@gmail.com
              </a>
            </div>
          </section>

        </div>

      </main>
    </div>
  );
}
