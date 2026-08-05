"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User, AtSign, ArrowRight } from "lucide-react";
import { handleSignupAction } from "./actions";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptCookies, setAcceptCookies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    if (!acceptTerms || !acceptCookies) {
      setErrorMsg("You must accept both the Terms & Conditions and Cookies Policy to register.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = (await handleSignupAction(formData)) as { error?: string; success?: boolean };

    if (result?.error) {
      const finalError = 
        typeof result.error === "string" 
          ? result.error 
          : (result.error as any)?.message || JSON.stringify(result.error);

      setErrorMsg(finalError);
      setLoading(false);
    } else {
      // ── LOGGING SYSTEM INTEGRATION ──
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("audit_logs").insert({
            moderator_id: user.id,
            action_type: "USER_SIGNUP",
            target_id: user.id,
            details: `New operator profile created for user ${user.email} (Username: ${username}).`
          });
        }
      } catch (err) {
        console.error("Failed to insert signup audit log:", err);
      }
      // ────────────────────────────────

      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md p-5 sm:p-8 rounded-xl bg-[#121216] border border-white/10 shadow-2xl relative overflow-hidden my-auto">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent"></div>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex p-3 rounded-xl bg-fuchsia-600/10 border border-fuchsia-500/30 text-fuchsia-500 mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Create Operator Profile</h1>
          <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-1 px-2">Register to join the ASTEROID GAMING-CLOUD grid</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Username</label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
              <input 
                type="text" 
                name="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator_x"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Display Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
              <input 
                type="text" 
                name="displayName"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ASTEROID GAMING-CLOUD Operator"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
              <input 
                type="email" 
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@nexusplay.com"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
              <input 
                type="password" 
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
              />
            </div>
          </div>

          {/* Terms & Conditions and Cookies Checkboxes */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
              <input 
                type="checkbox"
                name="acceptTerms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-black/50 text-fuchsia-600 focus:ring-0 cursor-pointer shrink-0"
              />
              <span>
                I agree to the <Link href="/terms" target="_blank" className="text-fuchsia-400 underline hover:text-fuchsia-300">Terms & Conditions</Link> and platform rules. <span className="text-fuchsia-500">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
              <input 
                type="checkbox"
                name="acceptCookies"
                checked={acceptCookies}
                onChange={(e) => setAcceptCookies(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-black/50 text-fuchsia-600 focus:ring-0 cursor-pointer shrink-0"
              />
              <span>
                I accept the use of <Link href="/cookies" target="_blank" className="text-fuchsia-400 underline hover:text-fuchsia-300">Cookies & Privacy Policy</Link> for session tracking. <span className="text-fuchsia-500">*</span>
              </span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading || !acceptTerms || !acceptCookies}
            className="w-full py-3 sm:py-2.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(217,70,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
          >
            <span>{loading ? "Registering..." : "Register Profile"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400 font-mono">
          Already have an operator profile?{" "}
          <Link href="/auth/login" className="text-fuchsia-400 hover:underline font-bold">
            Login
          </Link>
        </div>

      </div>
    </div>
  );
}
