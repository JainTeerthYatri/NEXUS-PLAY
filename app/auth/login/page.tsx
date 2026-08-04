"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { handleLoginAction } from "./actions";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const result = await handleLoginAction(formData);

    if (result?.error) {
      setErrorMsg(result.error);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md p-5 sm:p-8 rounded-xl bg-[#121216] border border-white/10 shadow-2xl relative overflow-hidden my-auto">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex p-3 rounded-xl bg-red-600/10 border border-red-500/30 text-red-500 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Operator Login</h1>
          <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-1 px-2">Authenticate to access ASTEROID GAMING-CLOUD mainframe</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
              <input 
                type="email" 
                name="email"
                required
                placeholder="operator@asteroidcloud.com"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-red-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
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
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-red-500 outline-none transition-colors [&:-webkit-autofill]:!bg-black [&:-webkit-autofill]:!text-white [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#121216_inset]"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 sm:py-2.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)] disabled:opacity-50 mt-2 cursor-pointer"
          >
            <span>{loading ? "Authenticating..." : "Initialize Session"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400 font-mono">
          Don't have an operator profile?{" "}
          <Link href="/auth/signup" className="text-red-400 hover:underline font-bold">
            Sign Up
          </Link>
        </div>

      </div>
    </div>
  );
}
