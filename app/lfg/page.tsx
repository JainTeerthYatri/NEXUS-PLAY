"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { Radio, Plus, Globe, MessageSquare, Filter, Trash2, Users, Send, Search, Eye, Crown, Bot, LogOut, UserX } from "lucide-react";

type LfgListing = {
  id: string;
  user_id: string;
  game_title: string;
  region: string;
  skill_tier: string;
  max_players: number;
  description: string;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
    role?: string;
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

type LfgMember = {
  user_id: string;
  profiles?: {
    username: string;
    display_name: string;
  } | null;
  joined_at?: string;
};

export default function LfgBoardPage() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [listings, setListings] = useState<LfgListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [activeListing, setActiveListing] = useState<LfgListing | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participantCounts, setParticipantCounts] = useState<{ [key: string]: number }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeMembersListing, setActiveMembersListing] = useState<LfgListing | null>(null);
  const [lfgMembersList, setLfgMembersList] = useState<LfgMember[]>([]);
  const [loadingLfgMembers, setLoadingLfgMembers] = useState(false);

  const [filterGame, setFilterGame] = useState("ALL");
  const [filterRegion, setFilterRegion] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [gameTitle, setGameTitle] = useState("Valorant");
  const [region, setRegion] = useState("Asia");
  const [skillTier, setSkillTier] = useState("Ascendant");
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [description, setDescription] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setUserRole(profile.role);
        }
      }
      await fetchListings();
    }
    init();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('lfg-global-participants')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lfg_participants' },
        () => {
          if (listings.length > 0) {
            fetchParticipantCounts(listings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listings]);

  // Real-time synchronization for members modal
  useEffect(() => {
    if (!activeMembersListing) return;

    const channel = supabase
      .channel(`lfg-members-${activeMembersListing.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lfg_participants',
          filter: `listing_id=eq.${activeMembersListing.id}`,
        },
        () => {
          openLfgMembersModal(activeMembersListing);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMembersListing]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchParticipantCounts(list: LfgListing[]) {
    const countsMap: { [key: string]: number } = {};
    for (const item of list) {
      const { count } = await supabase
        .from("lfg_participants")
        .select("*", { count: 'exact', head: true })
        .eq("listing_id", item.id);
      countsMap[item.id] = (count || 0) + 1;
    }
    setParticipantCounts(countsMap);
  }

  async function fetchListings() {
    const { data, error } = await supabase
      .from("lfg_listings")
      .select("*, profiles(username, display_name, role)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setListings(data);
      await fetchParticipantCounts(data);
    }
    setLoading(false);
  }

  async function handleCreateListing(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("Please authenticate via Supabase Auth to deploy an LFG node.");
      return;
    }

    const { error } = await supabase.from("lfg_listings").insert({
      user_id: user.id,
      game_title: gameTitle,
      region,
      skill_tier: skillTier,
      max_players: Number(maxPlayers),
      description,
    });

    if (!error) {
      setIsModalOpen(false);
      setDescription("");
      fetchListings();
    } else {
      alert("Error publishing listing: " + error.message);
    }
  }

  async function handleDeleteListing(id: string) {
    if (!confirm("Are you sure you want to purge this matchmaking node?")) return;

    const { error } = await supabase
      .from("lfg_listings")
      .delete()
      .eq("id", id);

    if (!error) {
      fetchListings();
    } else {
      alert("Error deleting listing: " + error.message);
    }
  }

  async function handleLeaveParty(item: LfgListing) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (item.user_id === user.id) {
      alert("Hosts cannot leave their own node. You can delete the node instead.");
      return;
    }

    if (!confirm("Are you sure you want to leave this party?")) return;

    const { error } = await supabase
      .from("lfg_participants")
      .delete()
      .eq("listing_id", item.id)
      .eq("user_id", user.id);

    if (error) {
      alert("Error leaving party: " + error.message);
      return;
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const leavingUsername = userProfile?.username || "operator";

    await supabase.from("chat_messages").insert({
      listing_id: item.id,
      sender_id: user.id,
      message: `[ASTEROID_BOT] This is to inform you all that @${leavingUsername} has left the '${item.game_title}' squad.`,
    });

    setActiveListing(null);
    setActiveMembersListing(null);
    fetchListings();
  }

  async function handleKickMember(memberUserId: string) {
    if (!activeMembersListing) return;
    if (!confirm("Are you sure you want to kick this operator from the squad?")) return;

    const { error } = await supabase
      .from("lfg_participants")
      .delete()
      .eq("listing_id", activeMembersListing.id)
      .eq("user_id", memberUserId);

    if (error) {
      alert("Error kicking member: " + error.message);
      return;
    }

    const { data: kickedProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", memberUserId)
      .single();

    const kickedUsername = kickedProfile?.username || "operator";

    await supabase.from("chat_messages").insert({
      listing_id: activeMembersListing.id,
      sender_id: user.id,
      message: `[ASTEROID_BOT] Notice: @${kickedUsername} has been removed from the squad by the host.`,
    });

    await openLfgMembersModal(activeMembersListing);
    await fetchParticipantCounts(listings);
  }

  async function openLfgMembersModal(item: LfgListing) {
    setActiveMembersListing(item);
    setLoadingLfgMembers(true);

    const membersMap: LfgMember[] = [];

    membersMap.push({
      user_id: item.user_id,
      profiles: item.profiles ? { username: item.profiles.username, display_name: item.profiles.display_name } : { username: "host", display_name: "Host" },
    });

    const { data: participantsData, error: partError } = await supabase
      .from("lfg_participants")
      .select("user_id, joined_at")
      .eq("listing_id", item.id);

    if (!partError && participantsData && participantsData.length > 0) {
      const userIds = participantsData.map((p: any) => p.user_id).filter((id: string) => id !== item.user_id);
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", userIds);

        const profileMap = new Map();
        profilesData?.forEach((prof: any) => profileMap.set(prof.id, prof));

        participantsData.forEach((p: any) => {
          if (p.user_id !== item.user_id) {
            const prof = profileMap.get(p.user_id);
            membersMap.push({
              user_id: p.user_id,
              profiles: prof ? { username: prof.username, display_name: prof.display_name } : { username: "operator", display_name: "Member" },
              joined_at: p.joined_at,
            });
          }
        });
      }
    }

    setLfgMembersList(membersMap);
    setLoadingLfgMembers(false);
  }

  async function openChat(item: LfgListing) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to connect to squad.");
      return;
    }

    if (item.user_id === user.id) {
      setActiveListing(item);
      await fetchMessages(item.id);
      await fetchParticipantCounts(listings);
      return;
    }

    const { data: existingParticipant } = await supabase
      .from("lfg_participants")
      .select("*")
      .eq("listing_id", item.id)
      .eq("user_id", user.id)
      .single();

    if (existingParticipant) {
      setActiveListing(item);
      await fetchMessages(item.id);
      await fetchParticipantCounts(listings);
      return;
    }

    const { count } = await supabase
      .from("lfg_participants")
      .select("*", { count: 'exact', head: true })
      .eq("listing_id", item.id);

    const currentJoined = count || 0;
    const totalCurrentMembers = currentJoined + 1;

    if (totalCurrentMembers >= item.max_players) {
      alert(`⚠️ Party Full! Maximum limit of ${item.max_players} players reached.`);
      return;
    }

    const { error: joinError } = await supabase
      .from("lfg_participants")
      .insert({
        listing_id: item.id,
        user_id: user.id
      });

    if (joinError) {
      alert("Error joining party: " + joinError.message);
      return;
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const joiningUsername = userProfile?.username || "operator";

    await supabase.from("chat_messages").insert({
      listing_id: item.id,
      sender_id: user.id,
      message: `[ASTEROID_BOT] This is to inform you all that here @${joiningUsername} had joined the '${item.game_title}' squad, so welcome him in the group!`,
    });

    setActiveListing(item);
    await fetchMessages(item.id);
    await fetchParticipantCounts(listings);
  }

  async function fetchMessages(listingId: string) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*, profiles(username)")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  }

  useEffect(() => {
    if (!activeListing) return;

    const channel = supabase
      .channel(`lfg-room-${activeListing.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `listing_id=eq.${activeListing.id}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsgWithProfile = {
            ...payload.new,
            profiles: profile || { username: "operator" }
          } as ChatMessage;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsgWithProfile.id)) return prev;
            return [...prev, newMsgWithProfile];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeListing]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeListing) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const msgContent = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("chat_messages").insert({
      listing_id: activeListing.id,
      sender_id: user.id,
      message: msgContent,
    });

    if (error) {
      alert("Error sending message: " + error.message);
    }
  }

  const filteredListings = listings.filter((item) => {
    const matchesGame = filterGame === "ALL" || item.game_title.toLowerCase() === filterGame.toLowerCase();
    const matchesRegion = filterRegion === "ALL" || item.region.toLowerCase().includes(filterRegion.toLowerCase());
    const matchesSearch = searchQuery === "" || 
      item.game_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.skill_tier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGame && matchesRegion && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col selection:bg-violet-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#121216] border border-violet-500/30 text-xs font-mono text-violet-400 mb-2 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>NEURAL_LFG_MATRIX // SECURE_NODES</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">LFG Board</h1>
            <p className="text-sm text-slate-400 mt-1">
              Automated slot-locked secure party channels with live real-time member tracking.
            </p>
          </div>

          {user && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Deploy LFG Node
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 rounded-2xl bg-[#121216] border border-white/10 shadow-lg">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Filter className="w-4 h-4 text-violet-400" /> Filters:
            </div>
            
            <select 
              value={filterGame} 
              onChange={(e) => setFilterGame(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-200 font-mono outline-none focus:border-violet-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Games</option>
              <option value="Valorant">Valorant</option>
              <option value="BGMI">BGMI</option>
              <option value="Free Fire">Free Fire</option>
              <option value="Counter-Strike 2">CS2</option>
              <option value="Minecraft">Minecraft</option>
            </select>

            <select 
              value={filterRegion} 
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-200 font-mono outline-none focus:border-violet-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Regions</option>
              <option value="Asia">Asia</option>
              <option value="EU">EU</option>
              <option value="NA">NA</option>
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search game, tier, requirements..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder:text-slate-500 outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-violet-400 font-mono text-sm animate-pulse">
            INITIALIZING_MATCHMAKING_NODES...
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#121216] border border-white/10 text-center max-w-md mx-auto my-12 shadow-xl">
            <Radio className="w-10 h-10 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-1">No Active LFG Nodes</h3>
            <p className="text-sm text-slate-400 mb-6">
              The matrix is clear or no nodes match your search criteria.
            </p>
            {user && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(139,92,246,0.2)] cursor-pointer"
              >
                Deploy Node
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item) => {
              const currentCount = participantCounts[item.id] || 1;
              const percentage = Math.min(100, (currentCount / item.max_players) * 100);
              const isFull = currentCount >= item.max_players;

              return (
                <div 
                  key={item.id}
                  className="p-6 rounded-2xl bg-[#121216] border border-white/10 hover:border-violet-500/50 transition-all flex flex-col justify-between shadow-xl group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-lg bg-violet-950/60 border border-violet-500/30 text-xs font-mono text-violet-400 font-semibold">
                        {item.game_title}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs font-mono text-emerald-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {item.region}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-xs font-mono text-amber-400">
                          {item.skill_tier}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                        Host: <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" /> <span className="text-slate-200 font-bold">@{item.profiles?.username || "operator"}</span>
                      </p>
                      
                      <button 
                        onClick={() => openLfgMembersModal(item)}
                        className="text-xs text-violet-400 hover:text-violet-300 font-mono flex items-center gap-1 bg-violet-950/30 px-2.5 py-1 rounded-lg border border-violet-500/20 transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Members ({currentCount})
                      </button>
                    </div>

                    <p className="text-slate-300 text-sm bg-black/40 p-3.5 rounded-xl border border-white/5 leading-relaxed min-h-[72px]">
                      {item.description}
                    </p>
                    
                    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center text-xs font-mono mb-2">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-violet-400" /> Slots Status
                        </span>
                        <span className={isFull ? "text-red-400 font-bold" : "text-violet-400 font-bold"}>
                          {currentCount} / {item.max_players} {isFull ? "(FULL)" : ""}
                        </span>
                      </div>
                      <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/10">
                        <div 
                          className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.5)]'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-white/5 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-slate-500 truncate">
                      ID: {item.id.slice(0, 8)}
                    </span>
                    <div className="flex items-center gap-2">
                      {user && (user.id === item.user_id || userRole === "owner" || userRole === "moderator") && (
                        <button 
                          onClick={() => handleDeleteListing(item.id)}
                          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
                          title="Delete LFG Node"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <button 
                        onClick={() => openChat(item)}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.25)] cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" /> Connect
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeMembersListing && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 rounded-2xl bg-[#121216] border border-violet-500/40 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-400" /> {activeMembersListing.game_title} Members
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Region: {activeMembersListing.region} | Slots: {participantCounts[activeMembersListing.id] || 1}/{activeMembersListing.max_players}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveMembersListing(null)}
                  className="text-violet-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  [CLOSE]
                </button>
              </div>

              {loadingLfgMembers ? (
                <div className="text-center py-10 text-violet-400 font-mono text-xs animate-pulse">
                  FETCHING_MEMBERS...
                </div>
              ) : lfgMembersList.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-mono text-xs">
                  No members found in this party.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {lfgMembersList.map((m, idx) => {
                      const isHost = m.user_id === activeMembersListing.user_id;
                      const isMe = user && m.user_id === user.id;
                      const canKick = user && user.id === activeMembersListing.user_id && !isHost;

                      return (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5"
                        >
                          <div className="flex items-center gap-2.5">
                            {isHost ? (
                              <Crown className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                            ) : (
                              <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                            )}
                            <div>
                              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                                @{m.profiles?.username || "operator"} {isMe && "(You)"}
                              </p>
                              <p className="text-[10px] font-mono text-slate-400">
                                {m.profiles?.display_name || (isHost ? "Host / Leader" : "Party Member")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono ${
                              isHost 
                                ? 'bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold' 
                                : 'bg-violet-950/60 border border-violet-500/30 text-violet-300'
                            }`}>
                              {isHost ? "HOST" : "MEMBER"}
                            </span>

                            {canKick && (
                              <button 
                                onClick={() => handleKickMember(m.user_id)}
                                className="p-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
                                title="Kick Member"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {user && user.id !== activeMembersListing.user_id && lfgMembersList.some(m => m.user_id === user.id) && (
                    <button 
                      onClick={() => handleLeaveParty(activeMembersListing)}
                      className="w-full py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-400 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    >
                      <LogOut className="w-4 h-4" /> Leave Party
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeListing && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg h-[520px] p-6 rounded-2xl bg-[#121216] border border-violet-500/40 shadow-2xl flex flex-col justify-between">
              
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    💬 Party Chat: {activeListing.game_title}
                  </h3>
                  <p className="text-xs font-mono text-violet-400 mt-0.5">
                    Region: {activeListing.region} | Active Slots: {participantCounts[activeListing.id] || 1} / {activeListing.max_players}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {user && user.id !== activeListing.user_id && (
                    <button 
                      onClick={() => handleLeaveParty(activeListing)}
                      className="px-3 py-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                      title="Leave Party"
                    >
                      <LogOut className="w-3 h-3" /> Leave
                    </button>
                  )}
                  <button 
                    onClick={() => setActiveListing(null)}
                    className="text-slate-400 hover:text-white text-xs font-mono px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    [CLOSE]
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-violet-500/20">
                {messages.length === 0 ? (
                  <div className="text-center text-xs font-mono text-slate-500 py-20">
                    SECURE_ROOM_INITIALIZED. START_THE_PARTY_CHAT!
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isBotMessage = msg.message.startsWith("[ASTEROID_BOT]");
                    const cleanMessage = isBotMessage ? msg.message.replace("[ASTEROID_BOT] ", "") : msg.message;
                    const isMe = user && msg.sender_id === user.id;

                    if (isBotMessage) {
                      return (
                        <div key={msg.id || index} className="my-2 p-3 rounded-xl bg-violet-950/30 border border-violet-500/40 text-center shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-violet-400 mb-1 font-mono">
                            <Bot className="w-4 h-4 text-violet-400 animate-bounce" /> ASTEROID CHAT BOT
                          </div>
                          <p className="text-xs text-slate-200 font-mono leading-relaxed">
                            {cleanMessage}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-mono text-slate-400 mb-1 px-1">
                          @{msg.profiles?.username || "operator"}
                        </span>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${isMe ? 'bg-violet-600 text-white rounded-br-none shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-black/60 border border-white/10 text-slate-200 rounded-bl-none'}`}>
                          <p className="break-words">{msg.message}</p>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-3 border-t border-white/10">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type secure message to party squad..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm focus:border-violet-500 outline-none transition-colors"
                />
                <button 
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>

            </div>
          </div>
        )}

        {isModalOpen && user && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-[#121216] border border-white/10 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5 text-violet-500" /> Deploy Matchmaking Node
              </h2>

              <form onSubmit={handleCreateListing} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Game Title</label>
                    <input 
                      type="text" 
                      required
                      value={gameTitle}
                      onChange={(e) => setGameTitle(e.target.value)}
                      placeholder="e.g., Valorant"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Server Region</label>
                    <input 
                      type="text" 
                      required
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g., Asia / EU / NA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Skill Tier Vector</label>
                    <input 
                      type="text" 
                      required
                      value={skillTier}
                      onChange={(e) => setSkillTier(e.target.value)}
                      placeholder="e.g., Diamond, Immortal"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Max Players (Slots)</label>
                    <input 
                      type="number" 
                      required
                      min={2}
                      max={10}
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Requirements Description</label>
                  <textarea 
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Specify role requirements, mic check status, strategy..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none resize-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold cursor-pointer transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  >
                    Publish Node
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
