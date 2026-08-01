"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Shield, Gamepad2, UserPlus, UserMinus, Trash2, Sparkles, CheckCircle2, Eye, Crown } from "lucide-react";

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

export default function FindSquadsPage() {
  const [user, setUser] = useState<any>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [userMemberships, setUserMemberships] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Members Modal State
  const [activeMembersSquad, setActiveMembersSquad] = useState<Squad | null>(null);
  const [squadMembersList, setSquadMembersList] = useState<SquadMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Form state for creating squad
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
      }
    }
    setLoading(false);
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

    setIsModalOpen(false);
    setName("");
    setUserMemberships((prev) => ({ ...prev, [newSquad.id]: true }));
    fetchSquads(user.id);
  }

  async function handleJoinSquad(squad: Squad) {
    if (!user) {
      alert("Please log in to join a squad.");
      return;
    }

    if (userMemberships[squad.id] || squad.created_by === user.id) {
      alert("You are already part of this squad!");
      return;
    }

    const { count } = await supabase
      .from("squad_members")
      .select("*", { count: 'exact', head: true })
      .eq("squad_id", squad.id);

    const activeCount = count || squad.current_members;

    if (activeCount >= squad.max_slots) {
      alert(`⚠️ Squad Full! Maximum limit of ${squad.max_slots} slots reached.`);
      return;
    }

    const { error: joinError } = await supabase.from("squad_members").insert({
      squad_id: squad.id,
      user_id: user.id
    });

    if (joinError) {
      alert("Error joining squad: " + joinError.message);
      return;
    }

    const newCount = activeCount + 1;
    await supabase
      .from("squads")
      .update({ current_members: newCount })
      .eq("id", squad.id);

    setUserMemberships((prev) => ({ ...prev, [squad.id]: true }));
    fetchSquads(user.id);
  }

  async function handleLeaveSquad(squad: Squad) {
    if (!user) return;
    if (squad.created_by === user.id) {
      alert("Squad leaders cannot leave their own squad. You can delete the squad instead.");
      return;
    }

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

      setUserMemberships((prev) => {
        const copy = { ...prev };
        delete copy[squad.id];
        return copy;
      });
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

    const { error } = await supabase
      .from("squads")
      .delete()
      .eq("id", squadId);

    if (!error) {
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

  return (
    <div className="min-h-screen bg-[#080600] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-amber-500/30">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#161004] border border-amber-500/50 text-xs font-mono text-amber-300 mb-2 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span>SQUAD_DIRECTORY // GOLDEN_LOBBIES</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              Find Squads
            </h1>
            <p className="text-sm text-amber-200/60 mt-1">
              Discover elite gaming teams, check competitive rank requirements, and deploy team lobbies instantly.
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

        {/* Squads Grid */}
        {loading ? (
          <div className="text-center py-20 text-yellow-400 font-mono text-sm animate-pulse">
            SYNCHRONIZING_GOLDEN_SQUADS...
          </div>
        ) : squads.length === 0 ? (
          <div className="p-12 rounded-xl bg-[#161004] border border-amber-500/40 text-center max-w-md mx-auto my-12 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
            <Gamepad2 className="w-10 h-10 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <h3 className="text-white font-bold mb-1">No Active Squad Lobbies</h3>
            <p className="text-sm text-amber-200/60 mb-6">
              No squads found in the database. Initialize a new squad lobby to start recruiting teammates.
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
            {squads.map((squad) => {
              const isCreator = squad.created_by === user?.id;
              const isJoined = userMemberships[squad.id] || isCreator;
              
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
                  </div>

                  <div className="pt-4 border-t border-amber-500/20 flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-200/70 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-yellow-400" />
                      {squad.current_members} / {squad.max_slots} Slots
                    </span>

                    <div className="flex items-center gap-2">
                      {isCreator && (
                        <button 
                          onClick={() => handleDeleteSquad(squad.id)}
                          className="px-2.5 py-1.5 rounded bg-red-950/40 hover:bg-red-600 border border-red-500/40 text-red-400 hover:text-white text-xs font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                          title="Delete Squad"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isCreator && isJoined ? (
                        <button 
                          onClick={() => handleLeaveSquad(squad)}
                          className="px-3 py-1.5 rounded bg-emerald-950/60 hover:bg-red-950/80 border border-emerald-500/40 hover:border-red-500/60 text-emerald-400 hover:text-red-300 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        >
                          <UserMinus className="w-3.5 h-3.5" /> Leave
                        </button>
                      ) : !isCreator ? (
                        <button 
                          onClick={() => handleJoinSquad(squad)}
                          className="px-3 py-1.5 rounded bg-[#080600] hover:bg-amber-500 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-black text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(251,191,36,0.1)] cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Join
                        </button>
                      ) : (
                        <span className="px-2.5 py-1.5 rounded bg-yellow-950/40 border border-yellow-500/30 text-yellow-300 text-xs font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Owner
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View Members Modal */}
        {activeMembersSquad && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="w-full max-w-md p-6 rounded-xl bg-[#161004] border border-amber-500/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
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
                    return (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded bg-[#080600] border border-amber-500/20"
                      >
                        <div className="flex items-center gap-2.5">
                          {isLeader ? (
                            <Crown className="w-4 h-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                          )}
                          <div>
                            <p className="text-sm font-bold text-white">
                              @{m.profiles?.username || "operator"}
                            </p>
                            <p className="text-[10px] font-mono text-amber-200/50">
                              {m.profiles?.display_name || "Squad Member"}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          isLeader 
                            ? 'bg-yellow-950/80 border border-yellow-500/50 text-yellow-300' 
                            : 'bg-amber-950/40 border border-amber-500/30 text-amber-300'
                        }`}>
                          {isLeader ? "LEADER" : "MEMBER"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Squad Modal */}
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