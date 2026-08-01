"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Send, Sparkles } from "lucide-react";

export default function GlobalChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    async function initChat() {
      // 1. Get logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Fetch initial messages
      const { data, error } = await supabase
        .from("global_chat")
        .select("id, message, created_at, user_id")
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) {
        const messagesWithProfiles = await Promise.all(
          data.map(async (msg) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, display_name")
              .eq("id", msg.user_id)
              .single();
            return { ...msg, profiles: profile };
          })
        );
        setMessages(messagesWithProfiles);
        scrollToBottom();
      }
    }
    initChat();

    // 3. Realtime subscription
    const channel = supabase
      .channel("public:global_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat" },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", payload.new.user_id)
            .single();

          const newMsg = { ...payload.new, profiles: profile };
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!currentUser) {
      alert("Please login first to chat in the global network!");
      return;
    }

    const { error } = await supabase.from("global_chat").insert({
      message: newMessage.trim(),
      user_id: currentUser.id,
    });

    if (error) {
      alert("Error sending message: " + error.message);
    } else {
      setNewMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-[#080600] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Header */}
        <div className="mb-4 pb-4 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#161004] border border-amber-500/50 text-xs font-mono text-amber-300 mb-1 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span>GLOBAL_NETWORK // PUBLIC_FREQUENCY</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Global Community Chat</h1>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-3 py-1.5 rounded border border-amber-500/40">
            NETWORK_ONLINE
          </span>
        </div>

        {/* Chat Box Container */}
        <div className="flex-1 flex flex-col rounded-xl bg-[#140e04] border border-amber-500/40 shadow-[0_0_20px_rgba(251,191,36,0.1)] overflow-hidden min-h-0">
          
          {/* Messages List Area (Scrollable with fixed inner bounds) */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-amber-200/40 font-mono text-xs">
                No transmissions on the global network yet. Send the first message below!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUser && msg.user_id === currentUser.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] font-mono text-amber-200/60 mb-1">
                      @{msg.profiles?.username || "operator"}
                    </span>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-lg text-sm font-medium ${
                      isMe 
                        ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(251,191,36,0.3)]" 
                        : "bg-[#1f1606] border border-amber-500/30 text-white"
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
              placeholder="Broadcast message to the global network..."
              className="flex-1 px-4 py-2.5 rounded bg-[#080600] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none transition-colors shadow-inner"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer"
            >
              <Send className="w-4 h-4" /> Broadcast
            </button>
          </form>

        </div>

      </main>
    </div>
  );
}
