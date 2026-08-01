"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Send, Sparkles, MessageSquare, Globe, UserPlus, Check, Trash2, ShieldCheck, Zap, Reply, X } from "lucide-react";

export default function AsteroidChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendUsernameInput, setFriendUsernameInput] = useState("");
  
  const [activeTab, setActiveTab] = useState<string>("global");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: any } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Play audio notification beep
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  // 1. Initialize User & Profile Data
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("username").eq("id", user.id).single();
        if (prof) setProfileUsername(prof.username);
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

  // 3. Load Messages & Realtime Sync
  useEffect(() => {
    if (!currentUser) return;

    async function loadMessages() {
      if (activeTab === "global") {
        const { data } = await supabase
          .from("global_chat")
          .select("*")
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

    const channelName = activeTab === "global" ? "public:global_chat" : `dm-${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: activeTab === "global" ? "global_chat" : "direct_messages" },
        async (payload) => {
          const msg = payload.new;
          if (activeTab === "global") {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            const { data: p } = await supabase.from("profiles").select("username").eq("id", msg.user_id).single();
            setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, profiles: p } : m)));
            if (msg.user_id !== currentUser.id) playNotificationSound();
          } else {
            if (
              (msg.sender_id === currentUser.id && msg.receiver_id === activeTab) ||
              (msg.sender_id === activeTab && msg.receiver_id === currentUser.id)
            ) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              if (msg.sender_id !== currentUser.id) {
                playNotificationSound();
              }
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

  // 4. Send Message with Reply Support
  const sendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !currentUser) return;

    const activeFriendObj = friends.find((f) => f.id === activeTab);
    const replySenderName = replyingTo
      ? (replyingTo.user_id === currentUser.id || replyingTo.sender_id === currentUser.id ? "You" : (activeTab === "global" ? replyingTo.profiles?.username : activeFriendObj?.username))
      : null;

    if (activeTab === "global") {
      const { data, error } = await supabase.from("global_chat").insert({
        message: textToSend,
        user_id: currentUser.id,
        reply_message: replyingTo ? replyingTo.message : null,
        reply_sender: replySenderName,
      }).select().single();

      if (!error && data) {
        setMessages((prev) => [...prev, { ...data, profiles: { username: profileUsername } }]);
        setReplyingTo(null);
        scrollToBottom();
      }
    } else {
      const { data, error } = await supabase.from("direct_messages").insert({
        message: textToSend,
        sender_id: currentUser.id,
        receiver_id: activeTab,
        reply_message: replyingTo ? replyingTo.message : null,
        reply_sender: replySenderName,
      }).select().single();

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
        setReplyingTo(null);
        scrollToBottom();
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    setNewMessage("");
    await sendChatMessage(text);
  };

  const handleQuickPing = async () => {
    if (activeTab === "global" || !currentUser) return;
    const friendObj = friends.find((f) => f.id === activeTab);
    const pingText = `⚡ URGENT PING FOR @${friendObj?.username || "operator"}! Wake up!`;
    await sendChatMessage(pingText);
  };

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
        
        <div className="mb-4 pb-3 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <h1 className="text-lg font-black text-white tracking-tight">ASTEROID GAMING-CLOUD // SECURE COMMS</h1>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-3 py-1 rounded border border-amber-500/40">
            ENCRYPTED
          </span>
        </div>

        <div className="flex flex-col md:flex-row h-[520px] rounded-xl bg-[#140e04] border border-amber-500/40 shadow-xl overflow-hidden relative">
          
          {/* Left Sidebar */}
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
            <div className="px-4 py-2.5 bg-[#0f0a02] border-b border-amber-500/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-white">
                  {activeTab === "global" ? "global-network" : `@${activeFriendObj?.username || "operator"}`}
                </span>
              </div>
              {activeTab !== "global" && (
                <button
                  onClick={handleQuickPing}
                  className="flex items-center gap-1 bg-yellow-500 hover:bg-yellow-400 text-black px-2.5 py-1 rounded text-[11px] font-extrabold cursor-pointer transition-transform active:scale-95"
                >
                  <Zap className="w-3 h-3 fill-current" /> Ping Alert
                </button>
              )}
            </div>

            {/* Messages Scroll Area with Touch Swipe & Right-Click Context Menu */}
            <div
              ref={chatContainerRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 focus:outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {messages.length === 0 ? (
                <div className="text-center py-16 text-amber-200/40 font-mono text-xs">
                  No transmissions found in this channel. (Right-click or right-swipe any message to reply)
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = currentUser && (msg.user_id === currentUser.id || msg.sender_id === currentUser.id);
                  const name = activeTab === "global" ? (msg.profiles?.username || profileUsername) : (isMe ? "You" : activeFriendObj?.username);
                  
                  let touchStartX = 0;

                  return (
                    <div
                      key={msg.id}
                      onTouchStart={(e) => { touchStartX = e.touches[0].clientX; }}
                      onTouchEnd={(e) => {
                        const diff = e.changedTouches[0].clientX - touchStartX;
                        if (diff > 50) setReplyingTo(msg);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, msg });
                      }}
                      className={`flex flex-col group relative ${isMe ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] font-mono text-amber-200/60 mb-0.5 px-1">
                        @{name || "operator"}
                      </span>
                      
                      <div className="flex items-center gap-2 max-w-[75%]">
                        <div
                          className={`px-3 py-2 text-xs font-medium break-words rounded-lg shadow cursor-pointer ${
                            isMe
                              ? "bg-amber-500 text-black rounded-tr-none"
                              : "bg-[#1f1606] border border-amber-500/30 text-white rounded-tl-none"
                          }`}
                        >
                          {/* Quoted Reply Preview Inside Message if Replied */}
                          {msg.reply_message && (
                            <div className="mb-1.5 p-1.5 rounded bg-black/20 border-l-2 border-amber-300 text-[10px] opacity-90">
                              <span className="font-bold block text-amber-300">@{msg.reply_sender || "operator"}</span>
                              <span className="truncate block">{msg.reply_message}</span>
                            </div>
                          )}
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Banner Above Input */}
            {replyingTo && (
              <div className="px-3 py-1.5 bg-[#1a1205] border-t border-amber-500/30 flex items-center justify-between text-xs text-amber-200 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <Reply className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Replying to <strong className="text-amber-400">@{replyingTo.user_id === currentUser?.id || replyingTo.sender_id === currentUser?.id ? "You" : (activeTab === "global" ? replyingTo.profiles?.username : activeFriendObj?.username)}</strong>: {replyingTo.message}
                  </span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:text-white cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Form */}
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

      {/* Right-Click Context Menu Popup */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[#1f1606] border border-amber-500/50 rounded-lg shadow-2xl py-1 w-36 text-xs text-slate-200"
        >
          <button
            onClick={() => {
              setReplyingTo(contextMenu.msg);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 hover:bg-amber-500/20 flex items-center gap-2 text-amber-300 font-bold cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
          
          {currentUser && (contextMenu.msg.user_id === currentUser.id || contextMenu.msg.sender_id === currentUser.id) && (
            <button
              onClick={() => {
                handleDeleteMessage(contextMenu.msg.id, contextMenu.msg.created_at);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-red-500/20 flex items-center gap-2 text-red-400 font-bold cursor-pointer border-t border-amber-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete (5m)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
