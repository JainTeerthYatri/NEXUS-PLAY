"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { Radio, Plus, Globe, MessageSquare, Filter, Trash2, Users } from "lucide-react";

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

export default function LfgBoardPage() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [listings, setListings] = useState<LfgListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Real-time Chat Modal State
  const [activeListing, setActiveListing] = useState<LfgListing | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participantCount, setParticipantCount] = useState<number>(1);

  // Filters state
  const [filterGame, setFilterGame] = useState("ALL");
  const [filterRegion, setFilterRegion] = useState("ALL");

  // Form state for new matchmaking node
  const [gameTitle, setGameTitle] = useState("Valorant");
  const [region, setRegion] = useState("Asia");
  const [skillTier, setSkillTier] = useState("Ascendant");
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");

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

  async function fetchListings() {
    const { data, error } = await supabase
      .from("lfg_listings")
      .select("*, profiles(username, display_name, role)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setListings(data);
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
      contact_info: contactInfo,
    });

    if (!error) {
      setIsModalOpen(false);
      setDescription("");
      setContactInfo("");
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

  // Secure Connect & Slot Check Logic
  async function openChat(item: LfgListing) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to connect to squad.");
      return;
    }

    // 1. Agar user khud Host hai, toh seedha enter karne do
    if (item.user_id === user.id) {
      setActiveListing(item);
      await fetchMessages(item.id);
      await updateParticipantCount(item.id);
      return;
    }

    // 2. Check karo ki user pehle se registered participant hai ya nahi
    const { data: existingParticipant } = await supabase
      .from("lfg_participants")
      .select("*")
      .eq("listing_id", item.id)
      .eq("user_id", user.id)
      .single();

    if (existingParticipant) {
      setActiveListing(item);
      await fetchMessages(item.id);
      await updateParticipantCount(item.id);
      return;
    }

    // 3. Current participants count fetch karo
    const { count, error: countError } = await supabase
      .from("lfg_participants")
      .select("*", { count: 'exact', head: true })
      .eq("listing_id", item.id);

    const currentJoined = count || 0;
    // Total members = Host (1) + Current Joined Participants
    const totalCurrentMembers = currentJoined + 1;

    if (totalCurrentMembers >= item.max_players) {
      alert(`⚠️ Party Full! Maximum limit of ${item.max_players} players reached.`);
      return;
    }

    // 4. Register user as a participant in lfg_participants table
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

    setActiveListing(item);
    await fetchMessages(item.id);
    await updateParticipantCount(item.id);
  }

  async function updateParticipantCount(listingId: string) {
    const { count } = await supabase
      .from("lfg_participants")
      .select("*", { count: 'exact', head: true })
      .eq("listing_id", listingId);
    
    // Total squad size = Host (1) + Participants count
    setParticipantCount((count || 0) + 1);
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

  // Realtime Subscription for Chat Messages
  useEffect(() => {
    if (!activeListing) return;

    const channel = supabase
      .channel(`room-${activeListing.id}`)
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

    const { error } = await supabase.from("chat_messages").insert({
      listing_id: activeListing.id,
      sender_id: user.id,
      message: newMessage,
    });

    if (!error) {
      setNewMessage("");
      fetchMessages(activeListing.id);
    } else {
      alert("Error sending message: " + error.message);
    }
  }

  // Filter logic
  const filteredListings = listings.filter((item) => {
    const matchesGame = filterGame === "ALL" || item.game_title.toLowerCase() === filterGame.toLowerCase();
    const matchesRegion = filterRegion === "ALL" || item.region.toLowerCase().includes(filterRegion.toLowerCase());
    return matchesGame && matchesRegion;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#121216] border border-violet-500/30 text-xs font-mono text-violet-400 mb-2">
              <Radio className="w-3.5 h-3.5" />
              <span>NEURAL_LFG_MATRIX // V2.7 SECURE_SLOTS</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">LFG Board</h1>
            <p className="text-sm text-slate-400 mt-1">
              Automated slot-locked secure party channels. Only authorized team members can access chat.
            </p>
          </div>

          {user && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(139,92,246,0.2)] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Deploy LFG Node
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl bg-[#121216] border border-white/10">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Filter className="w-4 h-4 text-violet-400" /> Filters:
          </div>
          
          <select 
            value={filterGame} 
            onChange={(e) => setFilterGame(e.target.value)}
            className="px-3 py-1.5 rounded bg-black/50 border border-white/10 text-xs text-slate-200 font-mono outline-none focus:border-violet-500"
          >
            <option value="ALL">All Games</option>
            <option value="Valorant">Valorant</option>
            <option value="BGMI">BGMI</option>
            <option value="Free Fire">Free Fire</option>
            <option value="Counter-Strike 2">CS2</option>
          </select>

          <select 
            value={filterRegion} 
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-3 py-1.5 rounded bg-black/50 border border-white/10 text-xs text-slate-200 font-mono outline-none focus:border-violet-500"
          >
            <option value="ALL">All Regions</option>
            <option value="Asia">Asia</option>
            <option value="EU">EU</option>
            <option value="NA">NA</option>
          </select>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 font-mono text-sm">
            INITIALIZING_MATCHMAKING_NODES...
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 rounded-xl bg-[#121216] border border-white/10 text-center max-w-md mx-auto my-12">
            <Radio className="w-10 h-10 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-1">No Active LFG Nodes</h3>
            <p className="text-sm text-slate-400 mb-6">
              The matrix is clear. Deploy a matchmaking post to recruit players.
            </p>
            {user && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs"
              >
                Deploy Node
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredListings.map((item) => (
              <div 
                key={item.id}
                className="p-6 rounded-xl bg-[#121216] border border-white/10 hover:border-violet-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
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

                  <p className="text-slate-300 text-sm mb-4 bg-black/40 p-3 rounded border border-white/5">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    Host: @{item.profiles?.username || "operator"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-1">
                      <Users className="w-3 h-3 text-violet-400" /> Max: {item.max_players}
                    </span>

                    {user && (user.id === item.user_id || userRole === "owner" || userRole === "moderator") && (
                      <button 
                        onClick={() => handleDeleteListing(item.id)}
                        className="p-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
                        title="Delete LFG Node"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button 
                      onClick={() => openChat(item)}
                      className="px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Connect
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Real-time Party Chat Modal with Slot Indicator */}
        {activeListing && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg h-[600px] p-6 rounded-xl bg-[#121216] border border-violet-500/40 shadow-2xl flex flex-col justify-between">
              
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    💬 Party Chat: {activeListing.game_title}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Region: {activeListing.region} | Slots Filled: {participantCount} / {activeListing.max_players}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveListing(null)}
                  className="text-slate-400 hover:text-white text-sm font-mono cursor-pointer"
                >
                  [CLOSE]
                </button>
              </div>

              {/* Messages Box */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                {messages.length === 0 ? (
                  <div className="text-center text-xs font-mono text-slate-500 py-20">
                    SECURE_ROOM_INITIALIZED. START_THE_PARTY_CHAT!
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = user && msg.sender_id === user.id;
                    return (
                      <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-mono text-slate-400 mb-1 px-1">
                          @{msg.profiles?.username || "operator"}
                        </span>
                        <div className={`max-w-[80%] p-3 rounded-xl text-sm ${isMe ? 'bg-violet-600 text-white rounded-br-none' : 'bg-black/60 border border-white/10 text-slate-200 rounded-bl-none'}`}>
                          <p>{msg.message}</p>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-3 border-t border-white/10">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type secure message to party squad..."
                  className="flex-1 px-3 py-2 rounded bg-black/50 border border-white/10 text-white text-sm focus:border-violet-500 outline-none"
                />
                <button 
                  type="submit"
                  className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold cursor-pointer"
                >
                  Send
                </button>
              </form>

            </div>
          </div>
        )}

        {/* Deploy LFG Node Modal */}
        {isModalOpen && user && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg p-6 rounded-xl bg-[#121216] border border-white/10 shadow-2xl">
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
                      className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none"
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
                      className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none"
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
                      className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none"
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
                      className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none"
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
                    className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">Contact Info (Discord / IGN)</label>
                  <input 
                    type="text" 
                    required
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="e.g., discord.gg/ASTEROID GAMING-CLOUD or #tag"
                    className="w-full px-3 py-2 rounded bg-black/40 border border-white/10 text-white text-sm focus:border-violet-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold cursor-pointer"
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
