"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Send, Sparkles, MessageSquare, Globe, User } from "lucide-react";

export default function DiscordStyleChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("global"); // "global" or user_id for DM
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch current user & all other profiles
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .neq("id", user.id);
        
        if (allProfiles) setProfiles(allProfiles);
      }
    }
    init();
  }, []);

  // 2. Fetch messages whenever activeTab changes
  useEffect(() => {
    if (!currentUser) return;

    async function fetchMessages() {
      if (activeTab === "global") {
        const { data } = await supabase
          .from("global_chat")
          .select("id, message, created_at, user_id")
          .order("created_at", { ascending: true })
          .limit(100);

        if (data) {
          const withProfiles = await Promise.all(
            data.map(async (msg) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username, display_name")
                .eq("id", msg.user_id)
                .single();
              return { ...msg, profiles: profile };
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

    fetchMessages();

    let channel: any;
    if (activeTab === "global") {
      channel = supabase
        .channel("public:global_chat")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_chat" }, async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", payload.new.user_id)
            .single();
          setMessages((prev) => [...prev, { ...payload.new, profiles: profile }]);
          scrollToBottom();
        })
        .subscribe();
    } else {
      channel = supabase
        .channel(`dm:${currentUser.id}-${activeTab}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === currentUser.id && msg.receiver_id === activeTab) ||
            (msg.sender_id === activeTab && msg.receiver_id === currentUser.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            scrollToBottom();
          }
        })
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeTab, currentUser]);

  // 3. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    if (activeTab === "global") {
      const { error } = await supabase.from("global_chat").insert({
        message: newMessage.trim(),
        user_id: currentUser.id,
      });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from("direct_messages").insert({
        message: newMessage.trim(),
        sender_id: currentUser.id,
        receiver_id: activeTab,
      });
      if (error) alert(error.message);
    }
    setNewMessage("");
  };

  // 4. Keyboard Arrow Up / Down Handler for PC
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

  const activeUserObj = profiles.find((p) => p.id === activeTab);

  return (
    <div className="min-h-screen bg-[#080600] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full flex flex-col h-[calc(100vh-80px)]">
        
        {/* Header Title */}
        <div className="mb-4 pb-3 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <h1 className="text-xl font-black text-white tracking-tight">ASTEROID GAMING-CLOUD // COMMUNICATIONS</h1>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-3 py-1 rounded border border-amber-500/40">
            SECURE_LINK_ACTIVE
          </span>
        </div>

        {/* Discord Style Container */}
        <div className="flex-1 flex rounded-xl bg-[#140e04] border border-amber-500/40 shadow-[0_0_20px_rgba(251,191,36,0.1)] overflow-hidden min-h-0">
          
          {/* Left Sidebar */}
          <div className="w-64 bg-[#0d0902] border-r border-amber-500/30 flex flex-col shrink-0">
            <div className="p-3 border-b border-amber-500/20 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
              Channels
            </div>
            
            <div className="p-2 space-y-1">
              <button
                onClick={() => setActiveTab("global")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === "global" ? "bg-amber-500 text-black font-bold" : "text-slate-300 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                <Globe className="w-4 h-4" /> Global Network
              </button>
            </div>

            <div className="p-3 border-y border-amber-500/20 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider mt-2">
              Direct Messages
            </div>

            {/* Invisible Scrollbar for Sidebar User List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {profiles.length === 0 ? (
                <p className="text-xs text-slate-500 p-2 font-mono">No other operators online.</p>
              ) : (
                profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveTab(p.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors cursor-pointer ${
                      activeTab === p.id ? "bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold" : "text-slate-400 hover:bg-amber-500/10 hover:text-slate-200"
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-500" />
                    <span className="truncate">@{p.username}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#140e04]">
            
            {/* Chat Top Bar */}
            <div className="px-4 py-3 bg-[#0f0a02] border-b border-amber-500/30 flex items-center gap-2 shrink-0">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm text-white">
                {activeTab === "global" ? "global-network" : `@${activeUserObj?.username || "operator"}`}
              </span>
              <span className="text-xs text-slate-400 font-mono ml-2">
                {activeTab === "global" ? "— Public frequency for all operators" : `— Secure private transmission`}
              </span>
            </div>

            {/* Messages Scroll Area with Invisible Scrollbar & Arrow Key Support */}
            <div 
              ref={chatContainerRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 focus:outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {messages.length === 0 ? (
                <div className="text-center py-20 text-amber-200/40 font-mono text-xs">
                  {activeTab === "global" ? "No transmissions on global network yet." : "No private messages yet. Send a transmission below!"}
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = currentUser && (msg.user_id === currentUser.id || msg.sender_id === currentUser.id);
                  const senderName = activeTab === "global" 
                    ? msg.profiles?.username 
                    : (isMe ? "You" : activeUserObj?.username);

                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <span className="text-[10px] font-mono text-amber-200/60 mb-1 px-1">
                        @{senderName || "operator"}
                      </span>
                      <div className={`max-w-[75%] px-4 py-2.5 text-sm font-medium break-words ${
                        isMe 
                          ? "bg-amber-500 text-black rounded-l-lg rounded-br-lg rounded-tr-none shadow-[0_0_10px_rgba(251,191,36,0.3)]" 
                          : "bg-[#1f1606] border border-amber-500/30 text-white rounded-r-lg rounded-bl-lg rounded-tl-none"
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#0d0902] border-t border-amber-500/30 flex gap-2 shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={activeTab === "global" ? "Broadcast to global network..." : `Send private message to @${activeUserObj?.username}...`}
                className="flex-1 px-4 py-2.5 rounded bg-[#080600] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none transition-colors shadow-inner"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </form>

          </div>

        </div>

      </main>
    </div>
  );
}
