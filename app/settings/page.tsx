// app/settings/page.tsx[cite: 12]
"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { User, Upload, Loader2, Sparkles, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
      })
      .eq("id", userId);

    if (error) {
      alert("Error updating profile: " + error.message);
    } else {
      alert("Operator profile telemetry updated successfully!");
      router.push("/dashboard");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#060b14] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-mono text-xs sm:text-sm text-cyan-400 animate-pulse px-4 text-center">
          LOADING_OPERATOR_SETTINGS...[cite: 12]
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
            <span>SYSTEM_CONFIG // SETTINGS[cite: 12]</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Operator Settings[cite: 12]</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure your broadcast identity, visual telemetry avatar, and bio parameters.[cite: 12]
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
              <h3 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider">Visual Telemetry Avatar[cite: 12]</h3>
              <p className="text-xs text-slate-400">Upload a graphic profile insignia (PNG, JPG, WebP).[cite: 12]</p>
              
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold cursor-pointer transition-all">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploading ? "Uploading telemetry..." : "Select Avatar"}[cite: 12]</span>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
          </div>

          {/* Text Fields Form */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0b1324] border border-cyan-500/30 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
            <h3 className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider mb-4 border-b border-cyan-500/20 pb-2">
              Identity Parameters[cite: 12]
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-cyan-400/80 mb-1">Display Name[cite: 12]</label>
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
                <label className="block text-xs font-mono text-cyan-400/80 mb-1">Username Handle (@)[cite: 12]</label>
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
              <label className="block text-xs font-mono text-cyan-400/80 mb-1">Broadcast Bio[cite: 12]</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded bg-[#060b14] border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                placeholder="Broadcast your playstyle, hardware setups, or preferred games..."
              ></textarea>
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
              <span>{saving ? "SAVING..." : "SAVE SPECS"}[cite: 12]</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
