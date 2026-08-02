"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User, AtSign, ArrowRight } from "lucide-react";
import { handleSignupAction } from "./actions";

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

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    if (!acceptTerms || !acceptCookies) {
      setErrorMsg("You must accept both the Terms & Conditions and Cookies Policy to register.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await handleSignupAction(formData);

    if (result?.error) {
      // Safely parse error to guarantee it displays text instead of {}
      const finalError = 
        typeof result.error === "string" 
          ? result.error 
          : (result.error as any)?.message || JSON.stringify(result.error);

      setErrorMsg(finalError);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#121216] border border-white/10 shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-red-600/10 border border-red-500/30 text-red-500 mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create Operator Profile</h1>
          <p className="text-xs font-mono text-slate-400 mt-1">Register to join the ASTEROID GAMING-CLOUD grid</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Username</label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input 
                type="text" 
                name="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator_x"
                className="w-full pl-10 pr-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-red-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Display Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input 
                type="text" 
                name="displayName"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ASTEROID GAMING-CLOUD Operator"
                className="w-full pl-10 pr-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-red-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input 
                type="email" 
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@nexusplay.com"
                className="w-full pl-10 pr-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-red-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input 
                type="password" 
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-red-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
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
                className="mt-0.5 rounded border-white/20 bg-black/50 text-red-600 focus:ring-0 cursor-pointer"
              />
              <span>
                I agree to the <Link href="/terms" target="_blank" className="text-red-400 underline hover:text-red-300">Terms & Conditions</Link> and platform rules. <span className="text-red-500">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
              <input 
                type="checkbox"
                name="acceptCookies"
                checked={acceptCookies}
                onChange={(e) => setAcceptCookies(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-black/50 text-red-600 focus:ring-0 cursor-pointer"
              />
              <span>
                I accept the use of <Link href="/cookies" target="_blank" className="text-red-400 underline hover:text-red-300">Cookies & Privacy Policy</Link> for session tracking. <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading || !acceptTerms || !acceptCookies}
            className="w-full py-2.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)] disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
          >
            <span>{loading ? "Registering..." : "Register Profile"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400 font-mono">
          Already have an operator profile?{" "}
          <Link href="/auth/login" className="text-red-400 hover:underline font-bold">
            Login
          </Link>
        </div>

      </div>
    </div>
  );
}
