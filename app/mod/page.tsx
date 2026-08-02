"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, Save, CheckCircle2, Search, Users, Shield, UserCheck, Trash2, MessageSquare, Radio, Globe, Ban, Send, Eye } from "lucide-react";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  updated_at: string;
};

type LfgListing = {
  id: string;
  user_id: string;
  game_title: string;
  region: string;
  skill_tier: string;
  max_players: number;
  description: string;
  contact_info: string;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
  };
};

type ChatMessage = {
  id: string;
  listing_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  profiles?: {
    username: string;
  };
};

export default function ModDashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [listings, setListings] = useState<LfgListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "lfg">("users");

  // User Action States
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  // Chat Inspector Modal States
  const [inspectingListing, setInspectingListing] = useState<LfgListing | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true });

      if (profileData && isMounted) {
        setProfiles(profileData);
      }

      // Fetch all LFG listings
      const { data: lfgData } = await supabase
        .from("lfg_listings")
        .select("*, profiles(username, display_name)")
        .order("created_at", { ascending: false });

      if (lfgData && isMounted) {
        setListings(lfgData);
      }

      if (isMounted) setLoading(false);
    }

    checkAccessAndFetchData();

    // Realtime Listeners for Profiles & LFG Listings
    const profileChannel = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Profile;
            setProfiles((prev) => prev.map((p) => p.id === updated.id ? updated : p));
          }
        }
      )
      .subscribe();

    const lfgChannel = supabase
      .channel("public:lfg_listings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lfg_listings" },
        async () => {
          if (!isMounted) return;
          const { data } = await supabase
            .from("lfg_listings")
            .select("*, profiles(username, display_name)")
            .order("created_at", { ascending: false });
          if (data) setListings(data);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(lfgChannel);
    };
  }, [supabase, router]);

  // Auto scroll chat inspector
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleLocalRoleChange(userId: string, newRole: string) {
    if (currentUserRole !== "owner" && currentUserRole !== "moderator") return;
    setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
  }

  // Save Role / Ban Function
  async function handleSaveRole(userId: string, newRole: string) {
    if (cooldown) {
      alert("Rate limit active: Please wait before making another change.");
      return;
    }

    setSavingId(userId);
    setCooldown(true);

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    setSavingId(null);
    setTimeout(() => setCooldown(false), 2000);

    if (error) {
      alert("Error updating security clearance: " + error.message);
    } else {
      setSuccessId(userId);
      setTimeout(() => setSuccessId(null), 2000);
      router.refresh();
    }
  }

  // Ban User Quick Action
  async function handleBanUser(userId: string, username: string) {
    if (!confirm(`⚠️ Are you sure you want to BAN operator @${username}? Their account will be restricted.`)) return;
    await handleSaveRole(userId, "banned");
  }

  // Delete LFG Listing by Mod/Owner
  async function handleDeleteLfgListing(listingId: string) {
    if (!confirm("⚠️ Are you sure you want to purge this LFG node and its squad chat?")) return;

    // Delete associated chat messages first or cascade
    await supabase.from("chat_messages").delete().eq("listing_id", listingId);
    await supabase.from("lfg_participants").delete().eq("listing_id", listingId);

    const { error } = await supabase
      .from("lfg_listings")
      .delete()
      .eq("id", listingId);

    if (error) {
      alert("Error purging LFG node: " + error.message);
    } else {
      setListings((prev) => prev.filter(l => l.id !== listingId));
      if (inspectingListing?.id === listingId) {
        setInspectingListing(null);
      }
    }
  }

  // Inspect Squad Chat
  async function openChatInspector(item: LfgListing) {
    setInspectingListing(item);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*, profiles(username)")
      .eq("listing_id", item.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setChatMessages(data);
    }
  }

  // Delete Toxic Message inside Squad Chat
  async function handleDeleteMessage(msgId: string) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", msgId);

    if (!error) {
      setChatMessages((prev) => prev.filter(m => m.id !== msgId));
    } else {
      alert("Error deleting message: " + error.message);
    }
  }

  // Realtime subscription for inspected squad chat
  useEffect(() => {
    if (!inspectingListing) return;

    const channel = supabase
      .channel(`mod-chat-inspector-${inspectingListing.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `listing_id=eq.${inspectingListing.id}` },
        async () => {
          const { data } = await supabase
            .from("chat_messages")
            .select("*, profiles(username)")
            .eq("listing_id", inspectingListing.id)
            .order("created_at", { ascending: true });
          if (data) setChatMessages(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inspectingListing, supabase]);

  // Filtered profiles or listings based on search query
  const filteredProfiles = profiles.filter(p => 
    (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.display_name && p.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredListings = listings.filter(l =>
    l.game_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.profiles?.username && l.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats calculation
  const totalOperators = profiles.length;
  const totalOwners = profiles.filter(p => p.role === "owner").length;
  const totalMods = profiles.filter(p => p.role === "moderator").length;
  const totalBanned = profiles.filter(p => p.role === "banned").length;
  const totalActiveLfg = listings.length;

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded bg-red-600/10 border border-red-500/30 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Command Center // Moderation</h1>
              <p className="text-sm text-slate-400 mt-1">
                {currentUserRole === "owner" ? "Owner Privilege Active: Full clearance over users, LFG nodes & squad chats." : "Moderator Clearance: Active oversight over user security, LFG listings & squad chats."}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder={activeTab === "users" ? "Search operators..." : "Search LFG nodes/games..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded bg-[#121216] border border-white/10 text-xs text-white font-mono outline-none focus:border-red-500 transition-colors shadow-inner"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
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
              <p className="text-xs font-mono text-slate-400">Owners / Mods</p>
              <h3 className="text-xl font-black text-white">{totalOwners + totalMods}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4">
            <div className="p-3 rounded bg-amber-600/10 text-amber-400 border border-amber-500/20"><Radio className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-mono text-slate-400">Active LFG Nodes</p>
              <h3 className="text-xl font-black text-white">{totalActiveLfg}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4">
            <div className="p-3 rounded bg-rose-600/10 text-rose-400 border border-rose-500/20"><Ban className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-mono text-slate-400">Banned Accounts</p>
              <h3 className="text-xl font-black text-white">{totalBanned}</h3>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Users className="w-4 h-4" /> Operator Security Clearance ({profiles.length})
          </button>

          <button
            onClick={() => setActiveTab("lfg")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "lfg"
                ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Radio className="w-4 h-4" /> LFG Matrix & Squad Chats ({listings.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-mono text-sm animate-pulse">
            FETCHING_SECURITY_MANIFEST...
          </div>
        ) : activeTab === "users" ? (
          /* USERS TAB */
          <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 font-mono text-xs text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-4">
              <div className="col-span-4">Operator / Username</div>
              <div className="col-span-4">Display Name</div>
              <div className="col-span-4">Security Clearance & Actions</div>
            </div>

            <div className="divide-y divide-white/5">
              {filteredProfiles.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  NO_OPERATORS_FOUND
                </div>
              ) : (
                filteredProfiles.map((profile) => (
                  <div key={profile.id} className="p-4 grid grid-cols-12 gap-4 items-center text-sm">
                    <div className="col-span-4 font-mono text-violet-400 font-bold flex items-center gap-2">
                      @{profile.username || "unknown"}
                      {profile.role === "banned" && (
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30 text-[10px] font-mono">BANNED</span>
                      )}
                    </div>
                    <div className="col-span-4 text-slate-300">
                      {profile.display_name || "N/A"}
                    </div>
                    <div className="col-span-4 flex items-center gap-2 flex-wrap">
                      <select
                        value={profile.role || "member"}
                        disabled={currentUserRole !== "owner" && profile.role === "owner"}
                        onChange={(e) => handleLocalRoleChange(profile.id, e.target.value)}
                        className="px-3 py-1.5 rounded bg-black/50 border border-white/10 text-white text-xs font-mono outline-none cursor-pointer focus:border-red-500"
                      >
                        <option value="member">Member</option>
                        <option value="moderator">Moderator</option>
                        <option value="owner">Owner</option>
                        <option value="banned">Banned</option>
                      </select>

                      <button
                        onClick={() => handleSaveRole(profile.id, profile.role)}
                        disabled={savingId === profile.id || cooldown}
                        className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 disabled:bg-red-900 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingId === profile.id ? "Saving..." : "Save"}
                      </button>

                      {profile.role !== "banned" && profile.role !== "owner" && (
                        <button
                          onClick={() => handleBanUser(profile.id, profile.username)}
                          className="px-2.5 py-1.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Ban Account"
                        >
                          <Ban className="w-3.5 h-3.5" /> Ban
                        </button>
                      )}

                      {successId === profile.id && (
                        <span className="text-emerald-400 text-xs flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-4 h-4" /> Saved
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* LFG MATRIX & SQUAD CHATS TAB */
          <div className="space-y-4">
            {filteredListings.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs bg-[#121216] border border-white/10 rounded-xl">
                NO_ACTIVE_LFG_NODES_FOUND
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredListings.map((item) => (
                  <div key={item.id} className="p-5 rounded-xl bg-[#121216] border border-white/10 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded bg-violet-950/60 border border-violet-500/30 text-xs font-mono text-violet-400">
                          {item.game_title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {item.region}
                          </span>
                          <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/30 text-xs font-mono text-amber-400">
                            {item.skill_tier}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-300 text-sm mb-3 bg-black/40 p-3 rounded-lg border border-white/5 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="text-xs font-mono text-slate-400 mb-4">
                        Host: <span className="text-slate-200">@{item.profiles?.username || "unknown"}</span> | Max Slots: <span className="text-violet-400">{item.max_players}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => openChatInspector(item)}
                        className="px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Squad Chat
                      </button>

                      <button
                        onClick={() => handleDeleteLfgListing(item.id)}
                        className="px-3 py-1.5 rounded bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Purge Node
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Squad Chat Inspector Modal */}
        {inspectingListing && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xl h-[650px] p-6 rounded-2xl bg-[#121216] border border-red-500/40 shadow-2xl flex flex-col justify-between">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    🛡️ Moderator Squad Chat Inspector: {inspectingListing.game_title}
                  </h3>
                  <p className="text-xs font-mono text-red-400 mt-0.5">
                    Host: @{inspectingListing.profiles?.username} | Region: {inspectingListing.region}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleDeleteLfgListing(inspectingListing.id);
                    }}
                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    PURGE ENTIRE LFG
                  </button>
                  <button 
                    onClick={() => setInspectingListing(null)}
                    className="text-slate-400 hover:text-white text-xs font-mono px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    [CLOSE]
                  </button>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-red-500/20">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-xs font-mono text-slate-500 py-24">
                    NO_MESSAGES_LOGGED_IN_THIS_SQUAD_CHAT
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-start justify-between gap-3 group">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-violet-400 font-bold">@{msg.profiles?.username || "operator"}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 break-words">{msg.message}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-70 group-hover:opacity-100 p-1.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400 transition-all cursor-pointer"
                        title="Delete toxic message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Footer Note */}
              <div className="pt-3 border-t border-white/10 text-center text-xs font-mono text-slate-500">
                Moderator audit logs active. Inappropriate messages can be purged instantly.
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
