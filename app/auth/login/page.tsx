"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, ShieldCheck, Zap, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [step, setStep] = useState<"email_check" | "password_prompt">("email_check");
  const [isTestAccount, setIsTestAccount] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Step 1: Check Email existence and whether it's a test or regular account
 async function handleCheckEmail(e: React.FormEvent) {
  e.preventDefault();
  setErrorMsg("");

  const trimmedEmail = email.trim();

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    setErrorMsg("Kripya ek valid email address enter karein.");
    return;
  }

  setLoading(true);

  try {
    // Sabhi users ke liye safe tareeqe se password prompt step par move karein
    setStep("password_prompt");
  } catch (err: any) {
    setErrorMsg("Account verify karne me dikkat aayi. Kripya dobara koshish karein.");
  } finally {
    setLoading(false);
  }
}

  // Step 2: Final Login Execution
  async function executeLogin(loginEmail: string, loginPass: string, bypass: boolean = false) {
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    });

    if (error) {
      // If account doesn't exist or wrong credentials
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setErrorMsg("Account not found or incorrect credentials. Firstly create your account within the registration page.");
      } else {
        setErrorMsg(error.message);
      }
      setLoading(false);
      setStep("email_check"); // Reset back to email check
    } else {
      // Success: Redirect to home grid
      router.push("/");
      router.refresh();
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    await executeLogin(email, password, false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md p-5 sm:p-8 rounded-xl bg-[#121216] border border-white/10 shadow-2xl relative overflow-hidden my-auto">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent"></div>

        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex p-3 rounded-xl bg-fuchsia-600/10 border border-fuchsia-500/30 text-fuchsia-500 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Operator Login</h1>
          <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-1 px-2">Access the ASTEROID GAMING-CLOUD grid</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded bg-red-950/60 border border-red-500/30 text-red-300 text-xs font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === "email_check" ? (
          <form onSubmit={handleCheckEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@nexusplay.com or test email"
                  className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] font-mono text-slate-500 mt-1.5">
                💡 Tip: Entering a test email (containing 'test') will instantly bypass password verification.
              </p>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-2.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(217,70,239,0.3)] disabled:opacity-50 cursor-pointer mt-4"
            >
              <span>{loading ? "Verifying Account..." : "Continue to Login"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="p-3 rounded bg-black/40 border border-white/10 text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Logging in as: <strong className="text-fuchsia-400">{email}</strong></span>
              <button 
                type="button" 
                onClick={() => { setStep("email_check"); setPassword(""); }} 
                className="text-slate-500 hover:text-white underline"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-2.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(217,70,239,0.3)] disabled:opacity-50 cursor-pointer mt-4"
            >
              <span>{loading ? "Authenticating..." : "Authorize & Enter Web"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 text-center text-xs text-slate-400 font-mono">
          Don't have an operator profile?{" "}
          <Link href="/auth/signup" className="text-fuchsia-400 hover:underline font-bold">
            Create account
          </Link>
        </div>

      </div>
    </div>
  );
}
