"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, Save, CheckCircle2, Search, Users, Shield, UserCheck, Trash2, Radio, Globe, Ban, Eye, UserX, Check } from "lucide-react";

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

type Squad = {
  id: string;
  name: string;
  game_title?: string;
  created_by: string;
  created_at: string;
  profiles?: {
    username: string;
  };
};

type ChatMessage = {
  id: string;
  listing_id?: string;
  squad_id?: string;
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
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "lfg" | "squads">("users");

  // User Action States
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  // Inspector Modal States (LFG or Squad)
  const [inspectingItem, setInspectingItem] = useState<{ type: "lfg" | "squad"; data: LfgListing | Squad } | null>(null);
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

      if (!currentProfile || currentProfile.role === "banned") {
        router.push("/banned");
        return;
      }

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

      // Fetch LFG listings
      const { data: lfgData } = await supabase
        .from("lfg_listings")
        .select("*, profiles(username, display_name)")
        .order("created_at", { ascending: false });

      if (lfgData && isMounted) {
        setListings(lfgData);
      }

      // Fetch Squads (if squad table exists)
      const { data: squadData } = await supabase
        .from("squads")
        .select("*, profiles(username)")
        .order("created_at", { ascending: false });

      if (squadData && isMounted) {
        setSquads(squadData);
      }

      if (isMounted) setLoading(false);
    }

    checkAccessAndFetchData();

    // Realtime Listeners for Profiles & Bans
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

    return () => {
      isMounted = false;
      supabase.removeChannel(profileChannel);
    };
  }, [supabase, router]);

  // Auto scroll chat inspector
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleLocalRoleChange(userId: string, newRole: string) {
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
    if (!confirm(`⚠️ Are you sure you want to BAN operator @${username}? Their account will be instantly restricted.`)) return;
    await handleSaveRole(userId, "banned");
  }

  // Pardon User Quick Action (Unban)
  async function handlePardonUser(userId: string, username: string) {
    if (!confirm(`🕊️ Pardon operator @${username}? This will restore their member access.`)) return;
    await handleSaveRole(userId, "member");
  }

  // Delete LFG Listing
  async function handleDeleteLfgListing(listingId: string) {
    if (!confirm("⚠️ Are you sure you want to purge this LFG node and its chat messages?")) return;

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
      if (inspectingItem?.data.id === listingId) {
        setInspectingItem(null);
      }
    }
  }

  // Delete Squad
  async function handleDeleteSquad(squadId: string) {
    if (!confirm("⚠️ Are you sure you want to delete this squad and its squad chat?")) return;

    await supabase.from("chat_messages").delete().eq("squad_id", squadId);
    const { error } = await supabase.from("squads").delete().eq("id", squadId);

    if (error) {
      alert("Error deleting squad: " + error.message);
    } else {
      setSquads((prev) => prev.filter(s => s.id !== squadId));
      if (inspectingItem?.data.id === squadId) {
        setInspectingItem(null);
      }
    }
  }

  // Inspect Chat (LFG or Squad)
  async function openChatInspector(type: "lfg" | "squad", item: LfgListing | Squad) {
    setInspectingItem({ type, data: item });
    const queryField = type === "lfg" ? "listing_id" : "squad_id";
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*, profiles(username)")
      .eq(queryField, item.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setChatMessages(data);
    } else {
      setChatMessages([]);
    }
  }

  // Delete Individual Chat Message
  async function handleDeleteMessage(msgId: string) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", msgId);

    if (!error) {
      setChatMessages((prev) => prev.filter(m => m.id !== msgId));
    } else {
      alert("Error deleting message: " + error.message);
    }
  }

  // Filter computations
  const filteredProfiles = profiles.filter(p => 
    (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.display_name && p.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredListings = listings.filter(l =>
    l.game_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.profiles?.username && l.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSquads = squads.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.game_title && s.game_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.profiles?.username && s.profiles.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalOperators = profiles.length;
  const totalOwners = profiles.filter(p => p.role === "owner").length;
  const totalMods = profiles.filter(p => p.role === "moderator").length;
  const totalBanned = profiles.filter(p => p.role === "banned").length;

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
                Full oversight of operators, LFG nodes, and squad chats with instant ban/pardon privileges.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search records..."
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
              <p className="text-xs font-mono text-slate-400">Active LFG & Squads</p>
              <h3 className="text-xl font-black text-white">{listings.length + squads.length}</h3>
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
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 flex-wrap">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "users" ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Users className="w-4 h-4" /> Operator Security ({profiles.length})
          </button>

          <button
            onClick={() => setActiveTab("lfg")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "lfg" ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Radio className="w-4 h-4" /> LFG Matrix ({listings.length})
          </button>

          <button
            onClick={() => setActiveTab("squads")}
            className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "squads" ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Users className="w-4 h-4" /> Squad Chats ({squads.length})
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
                <div className="p-8 text-center text-slate-500 font-mono text-xs">NO_OPERATORS_FOUND</div>
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

                      {profile.role === "banned" ? (
                        <button
                          onClick={() => handlePardonUser(profile.id, profile.username)}
                          className="px-3 py-1.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                          title="Pardon / Unban Account"
                        >
                          <Check className="w-3.5 h-3.5" /> Pardon
                        </button>
                      ) : profile.role !== "owner" && (
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
        ) : activeTab === "lfg" ? (
          /* LFG TAB */
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
                        Host: <span className="text-slate-200">@{item.profiles?.username || "unknown"}</span> | Slots: <span className="text-violet-400">{item.max_players}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => openChatInspector("lfg", item)}
                        className="px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect LFG Chat
                      </button>

                      <button
                        onClick={() => handleDeleteLfgListing(item.id)}
                        className="px-3 py-1.5 rounded bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Purge LFG
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* SQUADS TAB */
          <div className="space-y-4">
            {filteredSquads.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs bg-[#121216] border border-white/10 rounded-xl">
                NO_ACTIVE_SQUADS_FOUND
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSquads.map((squad) => (
                  <div key={squad.id} className="p-5 rounded-xl bg-[#121216] border border-white/10 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-500/30 text-xs font-mono text-indigo-400 font-bold">
                          {squad.name}
                        </span>
                        {squad.game_title && (
                          <span className="px-2.5 py-1 rounded bg-violet-950/60 border border-violet-500/30 text-xs font-mono text-violet-400">
                            {squad.game_title}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono text-slate-400 mb-4">
                        Squad Leader: <span className="text-slate-200">@{squad.profiles?.username || "unknown"}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => openChatInspector("squad", squad)}
                        className="px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Squad Chat
                      </button>

                      <button
                        onClick={() => handleDeleteSquad(squad.id)}
                        className="px-3 py-1.5 rounded bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Squad
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Inspector Modal */}
        {inspectingItem && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl h-[650px] p-6 rounded-2xl bg-[#121216] border border-red-500/40 shadow-2xl flex flex-col justify-between">
              
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    🛡️ Chat Inspector: {inspectingItem.type === "lfg" ? (inspectingItem.data as LfgListing).game_title : (inspectingItem.data as Squad).name}
                  </h3>
                  <p className="text-xs font-mono text-red-400 mt-0.5">
                    Realtime Moderator Audit
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (inspectingItem.type === "lfg") {
                        handleDeleteLfgListing(inspectingItem.data.id);
                      } else {
                        handleDeleteSquad(inspectingItem.data.id);
                      }
                    }}
                    className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                  >
                    PURGE {inspectingItem.type.toUpperCase()}
                  </button>
                  <button 
                    onClick={() => setInspectingItem(null)}
                    className="text-slate-400 hover:text-white text-xs font-mono px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    [CLOSE]
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-xs font-mono text-slate-500 py-24">
                    NO_MESSAGES_LOGGED_IN_THIS_CHAT
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

              <div className="pt-3 border-t border-white/10 text-center text-xs font-mono text-slate-500">
                Moderator audit active. Messages can be deleted individually or entire node purged.
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
