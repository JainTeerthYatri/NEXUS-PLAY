// app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { User, Upload, Loader2, Sparkles, Save, Trash2, ShieldAlert, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Profile Parameters
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // DPDP Sec 14: Right to Nominate
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeEmail, setNomineeEmail] = useState("");

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || null);
        setNomineeName(profile.nominee_name || "");
        setNomineeEmail(profile.nominee_email || "");
      }
      setLoading(false);
    }

    fetchProfile();
  }, [supabase, router]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0 || !userId) return;

      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      alert("Avatar uploaded successfully! Click Save Specs to update changes.");
    } catch (error: any) {
      alert("Error uploading avatar: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username: username,
        bio: bio,
        avatar_url: avatarUrl,
        nominee_name: nomineeName.trim() || null,
        nominee_email: nomineeEmail.trim() || null,
      })
      .eq("id", userId);

    if (error) {
      alert("Error updating profile: " + error.message);
    } else {
      // ── LOGGING SYSTEM INTEGRATION ──
      try {
        await supabase.from("audit_logs").insert({
          moderator_id: userId,
          action_type: "UPDATE_PROFILE",
          target_id: userId,
          details: `Operator @${username} updated profile settings and nominee parameters.`
        });
      } catch (logErr) {
        console.error("Failed to insert profile update audit log:", logErr);
      }
      // ────────────────────────────────

      alert("Operator profile telemetry updated successfully!");
      router.push("/dashboard");
    }
    setSaving(false);
  }

  // DPDP Sec 12: Account Erasure
  async function handleDeleteAccount() {
    if (!userId) return;

    const firstConfirm = confirm(
      "⚠️ WARNING: Kya aap apna account aur saara digital personal data permanently erase karna chahte hain? Yeh action wapas nahi liya ja sakta."
    );
    if (!firstConfirm) return;

    const typedUsername = prompt("Confirm karne ke liye apna username type karein:");
    if (typedUsername !== username) {
      alert("Username match nahi hua. Deletion request cancel ho gayi.");
      return;
    }

    setDeleting(true);

    try {
      // 1. Audit trail record karein
      await supabase.from("audit_logs").insert({
        moderator_id: userId,
        action_type: "ACCOUNT_ERASURE_REQUEST",
        target_id: userId,
        details: `Operator @${username} requested complete personal data erasure under DPDP Act Section 12.`
      });

      // 2. User ke clips, squad memberships aur listings cascade clean karein
      await supabase.from("clips").delete().eq("user_id", userId);
      await supabase.from("squad_members").delete().eq("user_id", userId);
      await supabase.from("lfg_participants").delete().eq("user_id", userId);
      await supabase.from("lfg_listings").delete().eq("user_id", userId);
      
      const { error: profileDeleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileDeleteError) throw profileDeleteError;

      // 3. User session disconnect
      await supabase.auth.signOut();

      alert("Aapka account aur personal telemetry records permanently delete kar diye gaye hain.");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      alert("Account deletion me error aaya: " + (err.message || "Failed to erase"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#060b14] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-mono text-xs sm:text-sm text-cyan-400 animate-pulse px-4 text-center">
          LOADING_OPERATOR_SETTINGS...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#060b14] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-10 w-full space-y-6 sm:space-y-8">
        <div className="pb-6 border-b border-cyan-500/20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#0b1324] border border-cyan-500/40 text-xs font-mono text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>SYSTEM_CONFIG // SETTINGS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Operator Settings</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure your broadcast identity, visual telemetry avatar, nominee details, and data rights.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Section */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0b1324] border border-cyan-500/30 flex flex-col sm:flex-row items-center gap-6 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
            <div className="w-20 h-20 rounded-xl bg-[#060b14] border border-cyan-500/50 overflow-hidden flex items-center justify-center text-cyan-300 font-black text-2xl shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-cyan-400" />
              )}
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <h3 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">Visual Telemetry Avatar</h3>
              <p className="text-xs text-slate-400">Upload a graphic profile insignia (PNG, JPG, WebP).</p>
              
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold cursor-pointer transition-all">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploading ? "Uploading telemetry..." : "Select Avatar"}</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>

          {/* Text Fields Form */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0b1324] border border-cyan-500/30 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
            <h3 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider mb-4 border-b border-cyan-500/20 pb-2">
              Identity Parameters
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-cyan-400/80 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-[#060b14] border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="e.g. CyberNinja"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-400/80 mb-1">Username Handle (@)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-[#060b14] border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="e.g. cyber_ninja"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-cyan-400/80 mb-1">Broadcast Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded bg-[#060b14] border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                placeholder="Broadcast your playstyle, hardware setups, or preferred games..."
              ></textarea>
            </div>
          </div>

          {/* DPDP Section 14: Data Nomination Form */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0b1324] border border-cyan-500/30 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
            <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">
                Digital Nominee Details
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Aapke account ya digital access ko handle karne ke liye kisi authorized person ko nominate karein (optional):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-cyan-400/80 mb-1">Nominee Full Name</label>
                <input
                  type="text"
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-[#060b14] border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="e.g. Rohit Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-cyan-400/80 mb-1">Nominee Contact Email</label>
                <input
                  type="email"
                  value={nomineeEmail}
                  onChange={(e) => setNomineeEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded bg-[#060b14] border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="e.g. nominee@gmail.com"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "SAVING..." : "SAVE SPECS"}</span>
            </button>
          </div>
        </form>

        {/* DPDP Section 12: Account Erasure Danger Zone */}
        <div className="p-4 sm:p-6 rounded-2xl bg-red-950/20 border border-red-500/40 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
              Danger Zone // Right to Erasure
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Agar aap platform se apna operator profile aur digital personal data permanently erase karna chahte hain, to niche diye gaye button par click karein. Aapke sabhi clips, squads link, LFG listings aur telemetry records database se turant delete ho jayenge.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="w-full sm:w-auto px-5 py-2.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleting ? "ERASING DATA..." : "ERASE ACCOUNT & DATA"}</span>
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}