"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, Plus, Shield, Gamepad2, UserPlus, UserMinus, 
  Trash2, Sparkles, CheckCircle2, Eye, Crown, Search, 
  Filter, MessageSquare, Send, Clock, X, Check, Bot 
} from "lucide-react";

type Squad = {
  id: string;
  name: string;
  game: string;
  rank: string;
  current_members: number;
  max_slots: number;
  created_by: string;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
  } | null;
};

type SquadMember = {
  user_id: string;
  profiles?: {
    username: string;
    display_name: string;
  } | null;
  joined_at: string;
};

type SquadRequest = {
  id: string;
  squad_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
  } | null;
};

type SquadMessage = {
  id: string;
  squad_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
  } | null;
};

export default function FindSquadsPage() {
  const [user, setUser] = useState<any>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [userMemberships, setUserMemberships] = useState<Record<string, boolean>>({});
  const [userRequests, setUserRequests] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameFilter, setSelectedGameFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");

  const [activeMembersSquad, setActiveMembersSquad] = useState<Squad | null>(null);
  const [squadMembersList, setSquadMembersList] = useState<SquadMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [activeRequestsSquad, setActiveRequestsSquad] = useState<Squad | null>(null);
  const [squadRequestsList, setSquadRequestsList] = useState<SquadRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [activeChatSquad, setActiveChatSquad] = useState<Squad | null>(null);
  const [chatMessages, setChatMessages] = useState<SquadMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [game, setGame] = useState("Valorant");
  const [rank, setRank] = useState("Diamond");
  const [maxSlots, setMaxSlots] = useState(5);

  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await fetchSquads(user.id);
      } else {
        await fetchSquads();
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!activeChatSquad) return;

    fetchMessages(activeChatSquad.id);

    const channel = supabase
      .channel(`squad_chat_${activeChatSquad.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'squad_messages',
          filter: `squad_id=eq.${activeChatSquad.id}`,
        },
        async (payload) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, display_name')
            .eq('id', payload.new.user_id)
            .single();

          const newMsg: SquadMessage = {
            ...(payload.new as SquadMessage),
            profiles: profileData,
          };

          setChatMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatSquad]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 100);
  };

  async function fetchSquads(currentUserId?: string) {
    const { data, error } = await supabase
      .from("squads")
      .select("*, profiles(username, display_name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSquads(data as Squad[]);

      if (currentUserId) {
        const { data: memberships } = await supabase
          .from("squad_members")
          .select("squad_id")
          .eq("user_id", currentUserId);

        const membershipMap: Record<string, boolean> = {};
        memberships?.forEach((m: any) => {
          if (m.squad_id) {
            membershipMap[m.squad_id] = true;
          }
        });
        setUserMemberships(membershipMap);

        const { data: requests } = await supabase
          .from("squad_requests")
          .select("squad_id, status")
          .eq("user_id", currentUserId);

        const requestMap: Record<string, string> = {};
        requests?.forEach((r: any) => {
          if (r.squad_id) {
            requestMap[r.squad_id] = r.status;
          }
        });
        setUserRequests(requestMap);
      }
    }
    setLoading(false);
  }

  async function fetchMessages(squadId: string) {
    const { data, error } = await supabase
      .from("squad_messages")
      .select("*, profiles(username, display_name)")
      .eq("squad_id", squadId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setChatMessages(data as SquadMessage[]);
      scrollToBottom();
    }
  }

  async function handleCreateSquad(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("Please authenticate via Supabase Auth to deploy a squad.");
      return;
    }

    const { data: newSquad, error: squadError } = await supabase.from("squads").insert({
      name,
      game,
      rank,
      max_slots: Number(maxSlots),
      created_by: user.id,
      current_members: 1,
    }).select().single();

    if (squadError || !newSquad) {
      alert("Error creating squad: " + squadError?.message);
      return;
    }

    await supabase.from("squad_members").insert({
      squad_id: newSquad.id,
      user_id: user.id
    });

    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const creatorUsername = creatorProfile?.username || "commander";

    await supabase.from("squad_messages").insert({
      squad_id: newSquad.id,
      user_id: user.id,
      message: `[ASTEROID_BOT] Squad '${name}' has been successfully deployed by @${creatorUsername}! Welcome to the tactical hub, operator.`,
    });

    // ── LOGGING SYSTEM INTEGRATION: CREATE SQUAD ──
    try {
      await supabase.from("audit_logs").insert({
        moderator_id: user.id,
        action_type: "CREATE_SQUAD",
        target_id: newSquad.id,
        details: `User deployed squad lobby '${name}' for ${game} (Rank: ${rank}).`
      });
    } catch (logErr) {
      console.error("Failed to insert create squad audit log:", logErr);
    }
    // ──────────────────────────────────────────────

    setIsModalOpen(false);
    setName("");
    setUserMemberships((prev) => ({ ...prev, [newSquad.id]: true }));
    fetchSquads(user.id);
  }

  async function handleRequestToJoin(squad: Squad) {
    if (!user) {
      alert("Please log in to send a join request.");
      return;
    }

    if (userMemberships[squad.id] || squad.created_by === user.id) {
      alert("You are already part of this squad!");
      return;
    }

    if (squad.current_members >= squad.max_slots) {
      alert("⚠️ Squad Full! Maximum limit reached.");
      return;
    }

    const { error } = await supabase.from("squad_requests").insert({
      squad_id: squad.id,
      user_id: user.id,
      status: 'pending'
    });

    if (error) {
      if (error.code === '23505') {
        alert("You have already sent a join request to this squad.");
      } else {
        alert("Error sending request: " + error.message);
      }
      return;
    }

    // ── LOGGING SYSTEM INTEGRATION: JOIN REQUEST ──
    try {
      await supabase.from("audit_logs").insert({
        moderator_id: user.id,
        action_type: "REQUEST_SQUAD_JOIN",
        target_id: squad.id,
        details: `User sent join request for squad '${squad.name}' (ID: ${squad.id}).`
      });
    } catch (logErr) {
      console.error("Failed to insert squad request audit log:", logErr);
    }
    // ──────────────────────────────────────────────

    setUserRequests((prev) => ({ ...prev, [squad.id]: 'pending' }));
    alert("📨 Join request sent successfully to the squad leader!");
  }

  async function openRequestsModal(squad: Squad) {
    setActiveRequestsSquad(squad);
    setLoadingRequests(true);

    const { data, error } = await supabase
      .from("squad_requests")
      .select("id, squad_id, user_id, status, created_at, profiles(username, display_name)")
      .eq("squad_id", squad.id)
      .eq("status", "pending");

    if (!error && data) {
      setSquadRequestsList(data as unknown as SquadRequest[]);
    } else {
      setSquadRequestsList([]);
    }
    setLoadingRequests(false);
  }

  async function handleAcceptRequest(req: SquadRequest, squad: Squad) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    if (squad.current_members >= squad.max_slots) {
      alert("⚠️ Cannot accept. Squad is already full!");
      return;
    }

    const { error: reqError } = await supabase
      .from("squad_requests")
      .update({ status: 'accepted' })
      .eq("id", req.id);

    if (reqError) {
      alert("Error accepting request: " + reqError.message);
      return;
    }

    const { error: memberError } = await supabase.from("squad_members").insert({
      squad_id: squad.id,
      user_id: req.user_id
    });

    if (memberError) {
      alert("Error adding member: " + memberError.message);
      return;
    }

    const newCount = squad.current_members + 1;
    await supabase
      .from("squads")
      .update({ current_members: newCount })
      .eq("id", squad.id);

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", req.user_id)
      .single();

    const joinedUsername = userProfile?.username || "operator";

    await supabase.from("squad_messages").insert({
      squad_id: squad.id,
      user_id: currentUser.id,
      message: `[ASTEROID_BOT] This is to inform you all that @${joinedUsername} has joined the '${squad.name}' squad, so welcome them warmly in the group!`,
    });

    // ── LOGGING SYSTEM INTEGRATION: ACCEPT REQUEST ──
    try {
      await supabase.from("audit_logs").insert({
        moderator_id: currentUser.id,
        action_type: "ACCEPT_SQUAD_REQUEST",
        target_id: squad.id,
        details: `Squad leader accepted user ID ${req.user_id} into squad '${squad.name}'.`
      });
    } catch (logErr) {
      console.error("Failed to insert accept squad request audit log:", logErr);
    }
    // ──────────────────────────────────────────────

    alert("✅ Request accepted! User has joined the squad.");
    openRequestsModal(squad);
    fetchSquads(currentUser?.id);
  }

  async function handleRejectRequest(reqId: string, squad: Squad) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("squad_requests")
      .update({ status: 'rejected' })
      .eq("id", reqId);

    if (!error) {
      // ── LOGGING SYSTEM INTEGRATION: REJECT REQUEST ──
      if (currentUser) {
        try {
          await supabase.from("audit_logs").insert({
            moderator_id: currentUser.id,
            action_type: "REJECT_SQUAD_REQUEST",
            target_id: squad.id,
            details: `Squad leader rejected join request ID ${reqId} for squad '${squad.name}'.`
          });
        } catch (logErr) {
          console.error("Failed to insert reject request audit log:", logErr);
        }
      }
      // ──────────────────────────────────────────────

      alert("Request rejected.");
      openRequestsModal(squad);
    } else {
      alert("Error rejecting request.");
    }
  }

  async function handleKickMember(memberUserId: string, squad: Squad) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser || currentUser.id !== squad.created_by) {
      alert("Only the squad leader can kick members.");
      return;
    }

    if (memberUserId === squad.created_by) {
      alert("You cannot kick yourself! Use delete squad instead.");
      return;
    }

    if (!confirm("Are you sure you want to kick this member from the squad?")) return;

    const { error: memberError } = await supabase
      .from("squad_members")
      .delete()
      .eq("squad_id", squad.id)
      .eq("user_id", memberUserId);

    if (memberError) {
      alert("Error kicking member: " + memberError.message);
      return;
    }

    const newCount = Math.max(1, squad.current_members - 1);
    await supabase
      .from("squads")
      .update({ current_members: newCount })
      .eq("id", squad.id);

    await supabase
      .from("squad_requests")
      .delete()
      .eq("squad_id", squad.id)
      .eq("user_id", memberUserId);

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", memberUserId)
      .single();

    const kickedUsername = userProfile?.username || "operator";

    await supabase.from("squad_messages").insert({
      squad_id: squad.id,
      user_id: currentUser.id,
      message: `[ASTEROID_BOT] This is to inform you all that @${kickedUsername} has been kicked from the '${squad.name}' squad by the leader.`,
    });

    // ── LOGGING SYSTEM INTEGRATION: KICK MEMBER ──
    try {
      await supabase.from("audit_logs").insert({
        moderator_id: currentUser.id,
        action_type: "KICK_SQUAD_MEMBER",
        target_id: memberUserId,
        details: `Squad leader kicked user ID ${memberUserId} from squad '${squad.name}'.`
      });
    } catch (logErr) {
      console.error("Failed to insert kick squad member audit log:", logErr);
    }
    // ──────────────────────────────────────────────

    // Instant local state update to remove member from table immediately
    setSquadMembersList((prev) => prev.filter((m) => m.user_id !== memberUserId));
    setActiveMembersSquad((prev) => prev ? { ...prev, current_members: newCount } : null);

    fetchSquads(currentUser.id);
    alert("✅ Member has been kicked from the squad.");
  }

  async function handleLeaveSquad(squad: Squad) {
    if (!user) return;
    if (squad.created_by === user.id) {
      alert("Squad leaders cannot leave their own squad. You can delete the squad instead.");
      return;
    }

    if (!confirm("Are you sure you want to leave this squad?")) return;

    const { error } = await supabase
      .from("squad_members")
      .delete()
      .eq("squad_id", squad.id)
      .eq("user_id", user.id);

    if (!error) {
      const newCount = Math.max(1, squad.current_members - 1);
      await supabase
        .from("squads")
        .update({ current_members: newCount })
        .eq("id", squad.id);

      await supabase
        .from("squad_requests")
        .delete()
        .eq("squad_id", squad.id)
        .eq("user_id", user.id);

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const leavingUsername = userProfile?.username || "operator";

      await supabase.from("squad_messages").insert({
        squad_id: squad.id,
        user_id: user.id,
        message: `[ASTEROID_BOT] This is to inform you all that @${leavingUsername} has left the '${squad.name}' squad.`,
      });

      // ── LOGGING SYSTEM INTEGRATION: LEAVE SQUAD ──
      try {
        await supabase.from("audit_logs").insert({
          moderator_id: user.id,
          action_type: "LEAVE_SQUAD",
          target_id: squad.id,
          details: `User left squad '${squad.name}' (ID: ${squad.id}).`
        });
      } catch (logErr) {
        console.error("Failed to insert leave squad audit log:", logErr);
      }
      // ──────────────────────────────────────────────

      setUserMemberships((prev) => {
        const copy = { ...prev };
        delete copy[squad.id];
        return copy;
      });
      setUserRequests((prev) => {
        const copy = { ...prev };
        delete copy[squad.id];
        return copy;
      });

      setActiveChatSquad(null);
      fetchSquads(user.id);
      alert("Successfully left the squad.");
    } else {
      alert("Error leaving squad: " + error.message);
    }
  }

  async function handleDeleteSquad(squadId: string) {
    if (!confirm("⚠️ Are you sure you want to delete this squad lobby? This action cannot be undone.")) {
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("squads")
      .delete()
      .eq("id", squadId);

    if (!error) {
      // ── LOGGING SYSTEM INTEGRATION: DELETE SQUAD ──
      if (currentUser) {
        try {
          await supabase.from("audit_logs").insert({
            moderator_id: currentUser.id,
            action_type: "DELETE_SQUAD",
            target_id: squadId,
            details: `User/Leader deleted squad lobby ID: ${squadId}.`
          });
        } catch (logErr) {
          console.error("Failed to insert delete squad audit log:", logErr);
        }
      }
      // ──────────────────────────────────────────────

      setUserMemberships((prev) => {
        const copy = { ...prev };
        delete copy[squadId];
        return copy;
      });
      fetchSquads(user?.id);
      alert("Squad deleted successfully.");
    } else {
      alert("Error deleting squad: " + error.message);
    }
  }

  async function openMembersModal(squad: Squad) {
    setActiveMembersSquad(squad);
    setLoadingMembers(true);

    const { data, error } = await supabase
      .from("squad_members")
      .select("user_id, joined_at, profiles(username, display_name)")
      .eq("squad_id", squad.id);

    if (!error && data) {
      setSquadMembersList(data as unknown as SquadMember[]);
    } else {
      setSquadMembersList([]);
    }
    setLoadingMembers(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatSquad || !user) return;

    const { error } = await supabase.from("squad_messages").insert({
      squad_id: activeChatSquad.id,
      user_id: user.id,
      message: newMessage.trim(),
    });

    if (!error) {
      setNewMessage("");
    } else {
      alert("Error sending message: " + error.message);
    }
  }

  const availableGames = useMemo(() => {
    const gamesSet = new Set<string>();
    squads.forEach(s => gamesSet.add(s.game));
    return ["All", ...Array.from(gamesSet)];
  }, [squads]);

  const filteredSquads = useMemo(() => {
    return squads.filter(squad => {
      const matchesSearch = 
        squad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        squad.game.toLowerCase().includes(searchQuery.toLowerCase()) ||
        squad.rank.toLowerCase().includes(searchQuery.toLowerCase()) ||
        squad.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGame = selectedGameFilter === "All" || squad.game.toLowerCase() === selectedGameFilter.toLowerCase();
      
      const isCreator = squad.created_by === user?.id;
      const isJoined = userMemberships[squad.id] || isCreator;
      const matchesTab = activeTab === "all" || (activeTab === "mine" && isJoined);

      return matchesSearch && matchesGame && matchesTab;
    });
  }, [squads, searchQuery, selectedGameFilter, activeTab, user, userMemberships]);

  return (
    <div className="min-h-screen bg-[#080600] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-amber-500/30">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#161004] border border-amber-500/50 text-xs font-mono text-amber-300 mb-2 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span>SQUAD_DIRECTORY // SECURE_LOBBIES</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              Find Squads & Chat
            </h1>
            <p className="text-sm text-amber-200/60 mt-1">
              Request to join elite gaming squads, get approval from leaders, and unlock secure tactical chat rooms.
            </p>
          </div>

          {user && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.4)] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" /> Create Squad
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 bg-[#161004] p-1.5 rounded-xl border border-amber-500/30 w-fit">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                  : "text-amber-200/70 hover:text-white"
              }`}
            >
              All Lobbies
            </button>
            {user && (
              <button
                onClick={() => setActiveTab("mine")}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === "mine"
                    ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]"
                    : "text-amber-200/70 hover:text-white"
                }`}
              >
                My Squads
              </button>
            )}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, game, rank, or leader..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#161004] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none transition-colors shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          <span className="text-xs font-mono text-amber-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Games:
          </span>
          {availableGames.map((gameName) => (
            <button
              key={gameName}
              onClick={() => setSelectedGameFilter(gameName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                selectedGameFilter.toLowerCase() === gameName.toLowerCase()
                  ? "bg-yellow-500/20 border border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                  : "bg-[#140e04] border border-amber-500/20 text-amber-200/60 hover:text-amber-300 hover:border-amber-500/40"
              }`}
            >
              {gameName}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-yellow-400 font-mono text-sm animate-pulse">
            SYNCHRONIZING_GOLDEN_SQUADS...
          </div>
        ) : filteredSquads.length === 0 ? (
          <div className="p-12 rounded-xl bg-[#161004] border border-amber-500/40 text-center max-w-md mx-auto my-12 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
            <Gamepad2 className="w-10 h-10 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <h3 className="text-white font-bold mb-1">No Squad Lobbies Found</h3>
            <p className="text-sm text-amber-200/60 mb-6">
              {searchQuery || selectedGameFilter !== "All" 
                ? "No squads match your active filters or search query." 
                : "No squads found in the database. Initialize a new squad lobby to start recruiting teammates."}
            </p>
            {user && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer"
              >
                Deploy Squad
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSquads.map((squad) => {
              const isCreator = squad.created_by === user?.id;
              const isJoined = userMemberships[squad.id] || isCreator;
              const reqStatus = userRequests[squad.id];
              const isFull = squad.current_members >= squad.max_slots;
              const slotPercentage = Math.min(100, (squad.current_members / squad.max_slots) * 100);
              
              return (
                <div 
                  key={squad.id}
                  className="p-6 rounded-xl bg-[#140e04] border border-amber-500/30 hover:border-yellow-400 transition-all flex flex-col justify-between shadow-[0_0_15px_rgba(251,191,36,0.06)] hover:shadow-[0_0_25px_rgba(251,191,36,0.2)] group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/50 text-xs font-mono text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
                        {squad.game}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-yellow-950/80 border border-yellow-500/60 text-xs font-mono text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                        {squad.rank}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-white text-lg mb-1 group-hover:text-yellow-300 transition-colors">
                      {squad.name}
                    </h3>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-amber-200/60 font-mono">
                        Lead: <span className="text-yellow-400 font-semibold">@{squad.profiles?.username || "commander"}</span>
                      </p>
                      
                      <button 
                        onClick={() => openMembersModal(squad)}
                        className="text-xs text-amber-400 hover:text-yellow-300 font-mono flex items-center gap-1 underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Members
                      </button>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-[11px] font-mono text-amber-200/70 mb-1">
                        <span>Squad Capacity</span>
                        <span>{squad.current_members} / {squad.max_slots}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#080600] rounded-full overflow-hidden border border-amber-500/20">
                        <div 
                          className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'}`}
                          style={{ width: `${slotPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-amber-500/20 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-amber-200/70 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-yellow-400" />
                        {isFull ? "Full Lobby" : `${squad.max_slots - squad.current_members} Slots Open`}
                      </span>

                      <div className="flex items-center gap-2">
                        {isCreator && (
                          <>
                            <button 
                              onClick={() => openRequestsModal(squad)}
                              className="px-2.5 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                              title="View Join Requests"
                            >
                              <Clock className="w-3.5 h-3.5" /> Requests
                            </button>
                            <button 
                              onClick={() => handleDeleteSquad(squad.id)}
                              className="px-2 py-1.5 rounded bg-red-950/40 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                              title="Delete Squad"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {!isCreator && isJoined ? (
                          <button 
                            onClick={() => handleLeaveSquad(squad)}
                            className="px-3 py-1.5 rounded bg-emerald-950/60 hover:bg-red-950/80 border border-emerald-500/40 hover:border-red-500/60 text-emerald-400 hover:text-red-300 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          >
                            <UserMinus className="w-3.5 h-3.5" /> Leave
                          </button>
                        ) : !isCreator && reqStatus === 'pending' ? (
                          <span className="px-2.5 py-1.5 rounded bg-yellow-950/40 border border-yellow-500/30 text-yellow-300 text-xs font-extrabold flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 animate-spin" /> Pending Approval
                          </span>
                        ) : !isCreator && reqStatus === 'rejected' ? (
                          <span className="px-2.5 py-1.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-extrabold">
                            Request Denied
                          </span>
                        ) : !isCreator ? (
                          <button 
                            onClick={() => handleRequestToJoin(squad)}
                            disabled={isFull}
                            className={`px-3 py-1.5 rounded text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                              isFull 
                                ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed' 
                                : 'bg-[#080600] hover:bg-amber-500 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-black shadow-[0_0_10px_rgba(251,191,36,0.1)] cursor-pointer'
                            }`}
                          >
                            <UserPlus className="w-3.5 h-3.5" /> {isFull ? "Full" : "Request Join"}
                          </button>
                        ) : (
                          <span className="px-2.5 py-1.5 rounded bg-yellow-950/40 border border-yellow-500/30 text-yellow-300 text-xs font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Owner
                          </span>
                        )}
                      </div>
                    </div>

                    {isJoined && (
                      <button
                        onClick={() => setActiveChatSquad(squad)}
                        className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_10px_rgba(251,191,36,0.15)]"
                      >
                        <MessageSquare className="w-4 h-4 text-yellow-400" /> Open Squad Chat Room
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Member Roster Modal */}
        {activeMembersSquad && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl p-6 rounded-xl bg-[#161004] border border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/30">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-yellow-400" /> {activeMembersSquad.name} Roster
                  </h3>
                  <p className="text-xs font-mono text-amber-200/60">
                    Game: {activeMembersSquad.game} | Slots: {activeMembersSquad.current_members}/{activeMembersSquad.max_slots}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveMembersSquad(null)}
                  className="text-amber-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  [CLOSE]
                </button>
              </div>

              {loadingMembers ? (
                <div className="text-center py-10 text-yellow-400 font-mono text-xs animate-pulse">
                  FETCHING_ROSTER...
                </div>
              ) : squadMembersList.length === 0 ? (
                <div className="text-center py-10 text-amber-200/50 font-mono text-xs">
                  No members found in this squad lobby.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {squadMembersList.map((m, idx) => {
                    const isLeader = m.user_id === activeMembersSquad.created_by;
                    const isCurrentLeader = user?.id === activeMembersSquad.created_by;

                    return (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded bg-[#080600] border border-amber-500/20"
                      >
                        <div className="flex items-center gap-2.5 truncate mr-2">
                          {isLeader ? (
                            <Crown className="w-4 h-4 text-yellow-400 shrink-0 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="text-sm font-bold text-white truncate">
                              @{m.profiles?.username || "operator"}
                            </p>
                            <p className="text-[10px] font-mono text-amber-200/50 truncate">
                              {m.profiles?.display_name || "Squad Member"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            isLeader 
                              ? 'bg-yellow-950/80 border border-yellow-500/50 text-yellow-300' 
                              : 'bg-amber-950/40 border border-amber-500/30 text-amber-300'
                          }`}>
                            {isLeader ? "LEADER" : "MEMBER"}
                          </span>

                          {isCurrentLeader && !isLeader && (
                            <button
                              onClick={() => handleKickMember(m.user_id, activeMembersSquad)}
                              className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                              title="Kick Member"
                            >
                              <UserMinus className="w-3 h-3" /> Kick
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeRequestsSquad && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 rounded-xl bg-[#161004] border border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-500/30">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-400" /> Pending Join Requests
                  </h3>
                  <p className="text-xs font-mono text-amber-200/60">
                    {activeRequestsSquad.name} ({activeRequestsSquad.current_members}/{activeRequestsSquad.max_slots} Slots)
                  </p>
                </div>
                <button 
                  onClick={() => setActiveRequestsSquad(null)}
                  className="text-amber-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  [CLOSE]
                </button>
              </div>

              {loadingRequests ? (
                <div className="text-center py-10 text-yellow-400 font-mono text-xs animate-pulse">
                  FETCHING_REQUESTS...
                </div>
              ) : squadRequestsList.length === 0 ? (
                <div className="text-center py-10 text-amber-200/50 font-mono text-xs">
                  No pending requests for this squad.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {squadRequestsList.map((req) => (
                    <div 
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded bg-[#080600] border border-amber-500/20"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">
                          @{req.profiles?.username || "operator"}
                        </p>
                        <p className="text-[10px] font-mono text-amber-200/50">
                          {req.profiles?.display_name || "Gamer"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req, activeRequestsSquad)}
                          className="p-1.5 rounded bg-emerald-950/80 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white transition-all cursor-pointer"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id, activeRequestsSquad)}
                          className="p-1.5 rounded bg-red-950/80 hover:bg-red-600 border border-red-500/40 text-red-300 hover:text-white transition-all cursor-pointer"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeChatSquad && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="w-full max-w-2xl h-[450px] flex flex-col rounded-xl bg-[#140e04] border border-amber-500/50 shadow-[0_0_40px_rgba(251,191,36,0.25)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 bg-[#1a1205] border-b border-amber-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/40">
                    <MessageSquare className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">
                      {activeChatSquad.name} // Tactical Chat Room
                    </h3>
                    <p className="text-xs font-mono text-amber-200/60">
                      Game: {activeChatSquad.game} • {activeChatSquad.current_members} Operators Connected
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user && user.id !== activeChatSquad.created_by && (
                    <button 
                      onClick={() => handleLeaveSquad(activeChatSquad)}
                      className="px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
                      title="Leave Squad"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Leave
                    </button>
                  )}
                  <button 
                    onClick={() => setActiveChatSquad(null)}
                    className="p-2 rounded-lg bg-amber-950/50 hover:bg-amber-900 text-amber-300 border border-amber-500/30 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0a0701]">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-20 text-amber-200/40 font-mono text-xs">
                    No tactical transmissions yet. Start the conversation below!
                  </div>
                ) : (
                  chatMessages.map((msg, index) => {
                    const isBotMessage = msg.message.startsWith("[ASTEROID_BOT]");
                    const cleanMessage = isBotMessage ? msg.message.replace("[ASTEROID_BOT] ", "") : msg.message;
                    const isMe = msg.user_id === user?.id;
                    const isLeader = msg.user_id === activeChatSquad.created_by;

                    if (isBotMessage) {
                      return (
                        <div key={msg.id || index} className="my-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-center shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-yellow-400 mb-1 font-mono">
                            <Bot className="w-4 h-4 text-yellow-400 animate-bounce" /> ASTEROID CHAT BOT
                          </div>
                          <p className="text-xs text-amber-200/90 font-mono leading-relaxed">
                            {cleanMessage}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id || index}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-amber-300">
                            @{msg.profiles?.username || "operator"}
                          </span>
                          {isLeader && (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-950/80 border border-yellow-500/40 text-[9px] font-mono text-yellow-300 flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> LEADER
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-amber-200/40">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl max-w-md text-sm ${
                          isMe 
                            ? 'bg-amber-500 text-black font-medium shadow-[0_0_15px_rgba(251,191,36,0.2)] rounded-tr-none' 
                            : 'bg-[#1a1205] text-slate-100 border border-amber-500/30 rounded-tl-none'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-[#1a1205] border-t border-amber-500/30 flex items-center gap-3">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a tactical message to your squad..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#080600] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none shadow-inner"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.4)] cursor-pointer"
                >
                  <Send className="w-4 h-4 text-black" /> Send
                </button>
              </form>
            </div>
          </div>
        )}

        {isModalOpen && user && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 rounded-xl bg-[#161004] border border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
              <h2 className="text-xl font-extrabold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> Deploy Gaming Squad
              </h2>

              <form onSubmit={handleCreateSquad} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-yellow-400/90 mb-1">Squad Title</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Phantom Protocol"
                    className="w-full px-3 py-2 rounded bg-[#080600] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none transition-colors shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-yellow-400/90 mb-1">Target Game</label>
                  <input 
                    type="text" 
                    required
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                    placeholder="e.g., Valorant / CS2 / BGMI"
                    className="w-full px-3 py-2 rounded bg-[#080600] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none transition-colors shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-yellow-400/90 mb-1">Rank Requirement</label>
                  <input 
                    type="text" 
                    required
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    placeholder="e.g., Diamond, Immortal"
                    className="w-full px-3 py-2 rounded bg-[#080600] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none transition-colors shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-yellow-400/90 mb-1">Max Player Slots</label>
                  <input 
                    type="number" 
                    required
                    min={2}
                    max={10}
                    value={maxSlots}
                    onChange={(e) => setMaxSlots(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded bg-[#080600] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none transition-colors shadow-inner"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-amber-500/20">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded bg-[#080600] hover:bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer"
                  >
                    Create Squad
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
