"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  AtSign, 
  ArrowRight, 
  Check, 
  X, 
  Calendar, 
  ShieldCheck, 
  AlertCircle,
  Users
} from "lucide-react";
import { handleSignupAction } from "./actions";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  // Phase 1: Account credentials state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Phase 2: Age Verification & Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dob, setDob] = useState("");
  const [isMinor, setIsMinor] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  // Minor Consent Data (If age < 18)
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalError, setModalError] = useState("");

  const router = useRouter();
  const supabase = createClient();

  // Password validation checks
  const hasMinLength = password.length >= 10;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasSpecialChar && hasNumber;

  // Step 1: Initial Form Validation (Client-Side Only, No Server Transmission)
  function handleInitiateVerification(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 25) {
      setErrorMsg("Username must be between 3 and 25 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setErrorMsg("Username may only contain letters, numbers, and underscores.");
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg("Password does not meet the specified security criteria.");
      return;
    }

    // Open Age Verification Modal without dispatching payload to backend
    setIsModalOpen(true);
  }

  // Calculate age when date of birth changes
  function handleDobChange(selectedDob: string) {
    setDob(selectedDob);
    setModalError("");

    if (!selectedDob) {
      setCalculatedAge(null);
      setIsMinor(false);
      return;
    }

    const birthDate = new Date(selectedDob);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    setCalculatedAge(age);

    if (age < 0 || age > 120) {
      setModalError("Please select a valid date of birth.");
      return;
    }

    if (age < 18) {
      setIsMinor(true);
    } else {
      setIsMinor(false);
    }
  }

  // Step 2: Final Verification & Profile Dispatch to Server
  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setModalError("");

    if (!dob || calculatedAge === null) {
      setModalError("Date of birth is required.");
      return;
    }

    if (isMinor) {
      if (!guardianName.trim() || !guardianEmail.trim()) {
        setModalError("Parent or legal guardian details are required for minor registration.");
        return;
      }
      if (!guardianConsent) {
        setModalError("Parent or guardian affirmative consent must be confirmed.");
        return;
      }
    }

    if (!acceptTerms) {
      setModalError("Please accept the Terms & Conditions and Privacy Policy.");
      return;
    }

    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim() || cleanUsername;
    const cleanEmail = email.trim();

    const formData = new FormData();
    formData.set("username", cleanUsername);
    formData.set("displayName", cleanDisplayName);
    formData.set("email", cleanEmail);
    formData.set("password", password);
    formData.set("dob", dob);
    formData.set("isMinor", isMinor ? "true" : "false");
    if (isMinor) {
      formData.set("guardianName", guardianName.trim());
      formData.set("guardianEmail", guardianEmail.trim());
    }
    formData.set("acceptTerms", "on");

    const result = (await handleSignupAction(formData)) as { error?: string; success?: boolean };

    if (result?.error) {
      const finalError =
        typeof result.error === "string"
          ? result.error
          : (result.error as any)?.message || JSON.stringify(result.error);

      setModalError(finalError);
      setLoading(false);
    } else {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("audit_logs").insert({
            moderator_id: user.id,
            action_type: "USER_SIGNUP",
            target_id: user.id,
            details: `Operator profile created for @${cleanUsername} (Age: ${calculatedAge}, Minor: ${isMinor}).`
          });
        }
      } catch (err) {
        console.error("Audit log registration failed:", err);
      }

      setIsModalOpen(false);
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
          <p className="text-[11px] sm:text-xs font-mono text-slate-400 mt-1 px-2">
            Phase 1: Credentials Setup
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* Phase 1 Form: Stored locally in state until age verification is finalized */}
        <form onSubmit={handleInitiateVerification} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Username</label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator_x"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Display Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
              <input 
                type="text" 
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="ASTEROID GAMING-CLOUD Operator"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 sm:top-3" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@asteroid-gaming.com"
                className="w-full pl-10 pr-3 py-2.5 sm:py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-fuchsia-500 outline-none transition-colors"
              />
            </div>
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

            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] font-mono">
              <div className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-400" : "text-slate-500"}`}>
                {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} 10+ characters
              </div>
              <div className={`flex items-center gap-1 ${hasUppercase ? "text-emerald-400" : "text-slate-500"}`}>
                {hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} One uppercase letter
              </div>
              <div className={`flex items-center gap-1 ${hasNumber ? "text-emerald-400" : "text-slate-500"}`}>
                {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} One number
              </div>
              <div className={`flex items-center gap-1 ${hasSpecialChar ? "text-emerald-400" : "text-slate-500"}`}>
                {hasSpecialChar ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} One special char
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={!isPasswordValid || !username || !email}
            className="w-full py-3 sm:py-2.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(217,70,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
          >
            <span>Continue to Verification</span>
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

      {/* Phase 2: Age Verification & Parental Consent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#121216] border border-fuchsia-500/40 rounded-2xl p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
            >
              [CANCEL]
            </button>

            <div className="text-center mb-5">
              <div className="inline-flex p-3 rounded-xl bg-fuchsia-600/10 border border-fuchsia-500/30 text-fuchsia-400 mb-2">
                {isMinor ? <Users className="w-6 h-6 text-amber-400" /> : <Calendar className="w-6 h-6" />}
              </div>
              <h2 className="text-lg font-bold text-white">
                {isMinor ? "Parental Consent Authorization" : "Age Verification Gateway"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isMinor 
                  ? "Minor account detected (< 18). Verifiable parental permission is required."
                  : "Please provide your birth date to calculate platform eligibility."}
              </p>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Date of Birth</label>
                <input 
                  type="date"
                  required
                  value={dob}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-black/50 border border-white/10 text-white text-xs font-mono outline-none focus:border-fuchsia-500"
                />
                {calculatedAge !== null && (
                  <p className="text-[11px] font-mono mt-1 text-slate-400">
                    Calculated Age: <strong className={isMinor ? "text-amber-400" : "text-emerald-400"}>{calculatedAge} years</strong>
                  </p>
                )}
              </div>

              {/* Dynamic Minor Parent/Guardian Section */}
              {isMinor && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono">
                    <ShieldCheck className="w-4 h-4" /> Parent / Legal Guardian Details
                  </div>
                  
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Guardian Full Name</label>
                    <input 
                      type="text"
                      required
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="Parent/Guardian Name"
                      className="w-full px-3 py-2 rounded bg-black/60 border border-white/10 text-white text-xs outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Guardian Contact Email</label>
                    <input 
                      type="email"
                      required
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      placeholder="guardian@example.com"
                      className="w-full px-3 py-2 rounded bg-black/60 border border-white/10 text-white text-xs font-mono outline-none focus:border-amber-500"
                    />
                  </div>

                  <label className="flex items-start gap-2 cursor-pointer pt-1 text-[11px] text-slate-300">
                    <input 
                      type="checkbox"
                      checked={guardianConsent}
                      onChange={(e) => setGuardianConsent(e.target.checked)}
                      className="mt-0.5 rounded bg-black border-white/20 text-amber-500 focus:ring-0 shrink-0"
                    />
                    <span>
                      I verify that my parent or legal guardian authorizes my participation on this platform.
                    </span>
                  </label>
                </div>
              )}

              {/* Terms and Privacy Confirmation */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-black/50 text-fuchsia-600 focus:ring-0 cursor-pointer shrink-0"
                  />
                  <span>
                    I accept the{" "}
                    <Link href="/terms" target="_blank" className="text-fuchsia-400 underline">Terms</Link>{" "}
                    and acknowledge data processing under the{" "}
                    <Link href="/privacy" target="_blank" className="text-fuchsia-400 underline">Privacy Policy</Link>[cite: 6].
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-400"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !acceptTerms || (isMinor && !guardianConsent)}
                  className="px-5 py-2.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs font-mono transition-all flex items-center gap-1.5 shadow-lg shadow-fuchsia-600/30 disabled:opacity-50"
                >
                  {loading ? "Registering Profile..." : "Confirm & Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}