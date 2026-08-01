"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, Save, CheckCircle2, Search, Users, Shield, UserCheck } from "lucide-react";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  updated_at: string;
};

export default function ModDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [searchQuery, setSearchQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    async function checkAccessAndFetchData() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      // Check current user role
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!currentProfile || (currentProfile.role !== "owner" && currentProfile.role !== "moderator")) {
        alert("Access Denied: You do not have moderator clearance.");
        router.push("/");
        return;
      }

      if (isMounted) {
        setIsAuthorized(true);
        setCurrentUserRole(currentProfile.role);
      }

      // Fetch profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true });

      if (!error && data && isMounted) {
        setProfiles(data);
      }
      if (isMounted) setLoading(false);
    }

    checkAccessAndFetchData();

    // Realtime Listener
    const channel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updatedProfile = payload.new as Profile;
          if (isMounted) {
            setProfiles((prevProfiles) =>
              prevProfiles.map((p) =>
                p.id === updatedProfile.id ? { ...p, role: updatedProfile.role } : p
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  function handleLocalRoleChange(userId: string, newRole: string) {
    if (currentUserRole !== "owner") return; // Safety check
    setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
  }

  // Rate-limited & Protected Role Save Function
  async function handleSaveRole(userId: string, newRole: string) {
    if (currentUserRole !== "owner") {
      alert("Unauthorized: Only the Platform Owner can change security clearance tags.");
      return;
    }

    if (cooldown) {
      alert("Rate limit active: Please wait a couple of seconds before making another change.");
      return;
    }

    setSavingId(userId);
    setCooldown(true);

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    setSavingId(null);

    // Cooldown timer reset after 2 seconds (Rate Limiting client protection)
    setTimeout(() => {
      setCooldown(false);
    }, 2000);

    if (error) {
      alert("Error updating role: " + error.message);
    } else {
      setSuccessId(userId);
      setTimeout(() => setSuccessId(null), 2000);
      router.refresh();
    }
  }

  // Filtered profiles based on search query
  const filteredProfiles = profiles.filter(p => 
    (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.display_name && p.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats calculation
  const totalOperators = profiles.length;
  const totalOwners = profiles.filter(p => p.role === "owner").length;
  const totalMods = profiles.filter(p => p.role === "moderator").length;

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded bg-red-600/10 border border-red-500/30 text-red-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Command Center // Moderation</h1>
              <p className="text-sm text-slate-400 mt-1">
                {currentUserRole === "owner" ? "Owner Privilege Active: Full clearance to modify tags." : "Moderator View: Tag modification restricted to Owner."}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search operators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded bg-[#121216] border border-white/10 text-xs text-white font-mono outline-none focus:border-red-500 transition-colors"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4">
            <div className="p-3 rounded bg-violet-600/10 text-violet-400 border border-violet-500/20"><Users className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-mono text-slate-400">Total Operators</p>
              <h3 className="text-xl font-black text-white">{totalOperators}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4">
            <div className="p-3 rounded bg-red-600/10 text-red-400 border border-red-500/20"><Shield className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-mono text-slate-400">Owners</p>
              <h3 className="text-xl font-black text-white">{totalOwners}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4">
            <div className="p-3 rounded bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"><UserCheck className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-mono text-slate-400">Moderators</p>
              <h3 className="text-xl font-black text-white">{totalMods}</h3>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-mono text-sm">
            FETCHING_SECURITY_MANIFEST...
          </div>
        ) : (
          <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 font-mono text-xs text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-4">
              <div className="col-span-4">Operator / Username</div>
              <div className="col-span-4">Display Name</div>
              <div className="col-span-4">Security Clearance (Role) & Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {filteredProfiles.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  NO_OPERATORS_FOUND
                </div>
              ) : (
                filteredProfiles.map((profile) => (
                  <div key={profile.id} className="p-4 grid grid-cols-12 gap-4 items-center text-sm">
                    <div className="col-span-4 font-mono text-violet-400 font-bold">
                      @{profile.username || "unknown"}
                    </div>
                    <div className="col-span-4 text-slate-300">
                      {profile.display_name || "N/A"}
                    </div>
                    <div className="col-span-4 flex items-center gap-2 flex-wrap">
                      <select
                        value={profile.role || "member"}
                        disabled={currentUserRole !== "owner"}
                        onChange={(e) => handleLocalRoleChange(profile.id, e.target.value)}
                        className={`px-3 py-1.5 rounded bg-black/50 border border-white/10 text-white text-xs font-mono outline-none ${
                          currentUserRole === "owner" ? "cursor-pointer focus:border-red-500" : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="owner">Owner</option>
                      </select>

                      {currentUserRole === "owner" && (
                        <button
                          onClick={() => handleSaveRole(profile.id, profile.role)}
                          disabled={savingId === profile.id || cooldown}
                          className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingId === profile.id ? "Saving..." : "Save"}
                        </button>
                      )}

                      {successId === profile.id && (
                        <span className="text-emerald-400 text-xs flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-4 h-4" /> Saved
                        </span>
                      )}

                      {currentUserRole !== "owner" && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                          profile.role === 'owner' ? 'bg-red-950/80 border border-red-500/30 text-red-400' :
                          profile.role === 'moderator' ? 'bg-violet-950/80 border border-violet-500/30 text-violet-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {profile.role || 'member'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}