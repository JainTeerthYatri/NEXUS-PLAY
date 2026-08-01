"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Send, Sparkles, MessageSquare, Globe, UserPlus, Check, Trash2, ShieldCheck } from "lucide-react";

export default function AsteroidChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendUsernameInput, setFriendUsernameInput] = useState("");
  
  const [activeTab, setActiveTab] = useState<string>("global"); // "global" or friend_id
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // 1. Initialize User & Friends Data
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        fetchFriendsAndRequests(user.id);
      }
    }
    init();
  }, []);

  async function fetchFriendsAndRequests(userId: string) {
    const { data: rels } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq("status", "accepted");

    if (rels) {
      const friendIds = rels.map((r) => (r.user_id === userId ? r.friend_id : r.user_id));
      if (friendIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", friendIds);
        setFriends(profilesData || []);
      } else {
        setFriends([]);
      }
    }

    const { data: pendings } = await supabase
      .from("friendships")
      .select("id, user_id")
      .eq("friend_id", userId)
      .eq("status", "pending");

    if (pendings && pendings.length > 0) {
      const senderIds = pendings.map((p) => p.user_id);
      const { data: sendersProfiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", senderIds);
      setPendingRequests(sendersProfiles || []);
    } else {
      setPendingRequests([]);
    }
  }

  // 2. Send Friend Request
  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendUsernameInput.trim() || !currentUser) return;

    const { data: targetUser, error: err } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", friendUsernameInput.trim().replace("@", ""))
      .single();

    if (err || !targetUser) {
      alert("Operator username not found!");
      return;
    }

    if (targetUser.id === currentUser.id) {
      alert("You cannot add yourself as a friend!");
      return;
    }

    const { error } = await supabase.from("friendships").insert({
      user_id: currentUser.id,
      friend_id: targetUser.id,
      status: "pending",
    });

    if (error) {
      alert("Request already sent or error occurred.");
    } else {
      alert("Secure friend request transmitted!");
      setFriendUsernameInput("");
    }
  };

  // 3. Accept Friend Request
  const handleAcceptRequest = async (senderId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("user_id", senderId)
      .eq("friend_id", currentUser.id);

    if (!error) {
      fetchFriendsAndRequests(currentUser.id);
      alert("Friend link established!");
    }
  };

  // 4. Load Messages & Realtime Sync
  useEffect(() => {
    if (!currentUser) return;

    async function loadMessages() {
      if (activeTab === "global") {
        const { data } = await supabase
          .from("global_chat")
          .select("id, message, created_at, user_id")
          .order("created_at", { ascending: true })
          .limit(100);

        if (data) {
          const withProfiles = await Promise.all(
            data.map(async (m) => {
              const { data: p } = await supabase.from("profiles").select("username").eq("id", m.user_id).single();
              return { ...m, profiles: p };
            })
          );
          setMessages(withProfiles);
        }
      } else {
        const { data } = await supabase
          .from("direct_messages")
          .select("*")
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeTab}),and(sender_id.eq.${activeTab},receiver_id.eq.${currentUser.id})`)
          .order("created_at", { ascending: true });

        if (data) setMessages(data);
      }
      scrollToBottom();
    }
    loadMessages();

    const channelName = activeTab === "global" ? "public:global_chat" : `dm:${currentUser.id}-${activeTab}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: activeTab === "global" ? "global_chat" : "direct_messages" },
        async (payload) => {
          const msg = payload.new;
          if (activeTab === "global") {
            const { data: p } = await supabase.from("profiles").select("username").eq("id", msg.user_id).single();
            setMessages((prev) => [...prev, { ...msg, profiles: p }]);
          } else {
            if (
              (msg.sender_id === currentUser.id && msg.receiver_id === activeTab) ||
              (msg.sender_id === activeTab && msg.receiver_id === currentUser.id)
            ) {
              setMessages((prev) => [...prev, msg]);
            }
          }
          scrollToBottom();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: activeTab === "global" ? "global_chat" : "direct_messages" },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, currentUser]);

  // 5. Send Message (TypeScript Type Fixed)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    let error = null;

    if (activeTab === "global") {
      const res = await supabase.from("global_chat").insert({
        message: newMessage.trim(),
        user_id: currentUser.id,
      });
      error = res.error;
    } else {
      const res = await supabase.from("direct_messages").insert({
        message: newMessage.trim(),
        sender_id: currentUser.id,
        receiver_id: activeTab,
      });
      error = res.error;
    }

    if (error) {
      alert("Error: " + error.message);
    } else {
      setNewMessage("");
    }
  };

  // 6. Delete Message (Within 5 minutes check)
  const handleDeleteMessage = async (msgId: string, createdAt: string) => {
    const sentTime = new Date(createdAt).getTime();
    const nowTime = new Date().getTime();
    const diffMinutes = (nowTime - sentTime) / (1000 * 60);

    if (diffMinutes > 5) {
      alert("Transmission can only be deleted within 5 minutes of dispatch!");
      return;
    }

    const tableName = activeTab === "global" ? "global_chat" : "direct_messages";
    const { error } = await supabase.from(tableName).delete().eq("id", msgId);

    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  };

  // Keyboard navigation for PC
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!chatContainerRef.current) return;
    if (e.key === "ArrowUp") {
      chatContainerRef.current.scrollTop -= 50;
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      chatContainerRef.current.scrollTop += 50;
      e.preventDefault();
    }
  };

  const activeFriendObj = friends.find((f) => f.id === activeTab);

  return (
    <div className="min-h-screen bg-[#080600] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-4 w-full flex flex-col">
        
        {/* Header */}
        <div className="mb-4 pb-3 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <h1 className="text-lg font-black text-white tracking-tight">ASTEROID GAMING-CLOUD // SECURE COMMS</h1>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-3 py-1 rounded border border-amber-500/40">
            ENCRYPTED
          </span>
        </div>

        {/* Main Box Container (Compact h-[520px]) */}
        <div className="flex flex-col md:flex-row h-[520px] rounded-xl bg-[#140e04] border border-amber-500/40 shadow-xl overflow-hidden">
          
          {/* Left Sidebar: Channels & Friends */}
          <div className="w-full md:w-64 bg-[#0d0902] border-r border-amber-500/30 flex flex-col shrink-0 h-44 md:h-full">
            
            <form onSubmit={handleSendFriendRequest} className="p-2 border-b border-amber-500/20 flex gap-1">
              <input
                type="text"
                placeholder="Add friend (@username)"
                value={friendUsernameInput}
                onChange={(e) => setFriendUsernameInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-[#080600] border border-amber-500/30 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button type="submit" className="p-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded cursor-pointer">
                <UserPlus className="w-4 h-4" />
              </button>
            </form>

            <div className="p-2">
              <button
                onClick={() => setActiveTab("global")}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold ${
                  activeTab === "global" ? "bg-amber-500 text-black" : "text-slate-300 hover:bg-amber-500/10"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Global Network
              </button>
            </div>

            {pendingRequests.length > 0 && (
              <div className="px-2 pb-2 border-b border-amber-500/20">
                <span className="text-[10px] font-mono text-yellow-400 font-bold uppercase block mb-1">Pending Requests</span>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-amber-950/40 p-1.5 rounded mb-1 border border-amber-500/30">
                    <span className="text-xs text-amber-200 truncate">@{req.username}</span>
                    <button onClick={() => handleAcceptRequest(req.id)} className="p-1 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs cursor-pointer">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-2 border-b border-amber-500/20 text-[10px] font-mono text-amber-400 font-bold uppercase">
              Friends DMs
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {friends.length === 0 ? (
                <p className="text-[11px] text-slate-500 p-1 font-mono">No friends added yet.</p>
              ) : (
                friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveTab(f.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs ${
                      activeTab === f.id ? "bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold" : "text-slate-400 hover:bg-amber-500/10"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span className="truncate">@{f.username}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#140e04] h-full">
            <div className="px-4 py-2.5 bg-[#0f0a02] border-b border-amber-500/30 flex items-center gap-2 shrink-0">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs text-white">
                {activeTab === "global" ? "global-network" : `@${activeFriendObj?.username || "operator"}`}
              </span>
            </div>

            <div
              ref={chatContainerRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 focus:outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {messages.length === 0 ? (
                <div className="text-center py-16 text-amber-200/40 font-mono text-xs">
                  No transmissions found in this channel.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = currentUser && (msg.user_id === currentUser.id || msg.sender_id === currentUser.id);
                  const name = activeTab === "global" ? msg.profiles?.username : (isMe ? "You" : activeFriendObj?.username);
                  
                  const sentTime = new Date(msg.created_at).getTime();
                  const canDelete = isMe && (new Date().getTime() - sentTime) <= (5 * 60 * 1000);

                  return (
                    <div key={msg.id} className={`flex flex-col group ${isMe ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] font-mono text-amber-200/60 mb-0.5 px-1">
                        @{name || "operator"}
                      </span>
                      <div className="flex items-center gap-2 max-w-[75%]">
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id, msg.created_at)}
                            title="Delete within 5 mins"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div
                          className={`px-3 py-2 text-xs font-medium break-words ${
                            isMe
                              ? "bg-amber-500 text-black rounded-l-lg rounded-br-lg rounded-tr-none"
                              : "bg-[#1f1606] border border-amber-500/30 text-white rounded-r-lg rounded-bl-lg rounded-tl-none"
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-2.5 bg-[#0d0902] border-t border-amber-500/30 flex gap-2 shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={activeTab === "global" ? "Broadcast to global network..." : `Message @${activeFriendObj?.username}...`}
                className="flex-1 px-3 py-2 rounded bg-[#080600] border border-amber-500/30 text-white text-xs focus:border-yellow-400 outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>

        </div>

      </main>
    </div>
  );
}
