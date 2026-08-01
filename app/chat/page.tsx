"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import { Send, Sparkles, MessageSquare, Globe, UserPlus, Check, Trash2, ShieldCheck, Reply, X, Search, ShieldAlert, Lock, Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Monitor, MonitorOff } from "lucide-react";

// --- E2EE Alphanumeric Crypto Helpers using Web Crypto API ---
async function getSharedKey(userId1: string, userId2: string) {
  const sortedIds = [userId1, userId2].sort().join("_");
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(sortedIds),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("asteroid_chat_e2ee_salt_v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function arrayToHex(arr: Uint8Array) {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToArray(hex: string) {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array(0);
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

async function encryptText(text: string, key: CryptoKey) {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return arrayToHex(combined);
}

async function decryptText(hexCiphertext: string, key: CryptoKey) {
  try {
    const combined = hexToArray(hexCiphertext);
    if (combined.length < 12) return hexCiphertext;
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return "[Encrypted Message]";
  }
}

export default function AsteroidChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friendUsernameInput, setFriendUsernameInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>("global");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [isModerator, setIsModerator] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: any } | null>(null);

  // --- WebRTC Call & Screen Share States ---
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ callerId: string; callerName: string; type: 'audio' | 'video'; offer?: any } | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const supabase = createClient();

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("username, role").eq("id", user.id).single();
        if (prof) {
          setProfileUsername(prof.username);
          if (prof.role === "owner" || prof.role === "moderator") {
            setIsModerator(true);
          }
        }
        fetchFriendsAndRequests(user.id);

        const userSignalChannel = supabase.channel(`user_signal_${user.id}`);
        userSignalChannel
          .on("broadcast", { event: "call-signal" }, async ({ payload }: { payload: any }) => {
            if (payload.action === "offer") {
              setIncomingCall({ callerId: payload.callerId, callerName: payload.callerName, type: payload.type, offer: payload.offer });
            } else if (payload.action === "hangup") {
              endCallCleanup();
            }
          })
          .subscribe();
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
        .select("id, username, display_name")
        .in("id", senderIds);
      setPendingRequests(sendersProfiles || []);
    } else {
      setPendingRequests([]);
    }
  }

  // --- WebRTC Call & Screen Share Handlers ---
  const createPeerConnection = (channel: any) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && channel) {
        channel.send({
          type: "broadcast",
          event: "rtc-signal",
          payload: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  };

  const flushIceQueue = async (pc: RTCPeerConnection) => {
    while (iceCandidateQueue.current.length > 0) {
      const candidate = iceCandidateQueue.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued ice candidate:", e);
        }
      }
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (activeTab === "global" || !currentUser) return;
    setCallType(type);
    setIsInCall(true);
    iceCandidateQueue.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const roomId = [currentUser.id, activeTab].sort().join('_');
      const channel = supabase.channel(`call_room_${roomId}`);
      signalingChannelRef.current = channel;

      const pc = createPeerConnection(channel);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      channel.on("broadcast", { event: "rtc-signal" }, async ({ payload }: { payload: any }) => {
        if (payload.answer) {
          if (!pc.remoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            await flushIceQueue(pc);
          }
        } else if (payload.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            iceCandidateQueue.current.push(payload.candidate);
          }
        }
      });

      channel.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await supabase.channel(`user_signal_${activeTab}`).send({
            type: "broadcast",
            event: "call-signal",
            payload: { action: "offer", callerId: currentUser.id, callerName: profileUsername, type, offer }
          });
        }
      });

    } catch (e) {
      console.error("Error starting call:", e);
      alert("Microphone/Camera access denied or unavailable.");
      endCallCleanup();
    }
  };

  const answerCall = async () => {
    if (!incomingCall || !currentUser) return;
    const callerId = incomingCall.callerId;
    setCallType(incomingCall.type);
    setIsInCall(true);
    const incomingOffer = incomingCall.offer;
    setIncomingCall(null);
    iceCandidateQueue.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingCall.type === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const roomId = [currentUser.id, callerId].sort().join('_');
      const channel = supabase.channel(`call_room_${roomId}`);
      signalingChannelRef.current = channel;

      const pc = createPeerConnection(channel);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      channel.on("broadcast", { event: "rtc-signal" }, async ({ payload }: { payload: any }) => {
        if (payload.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            iceCandidateQueue.current.push(payload.candidate);
          }
        }
      });

      channel.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED" && incomingOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
          await flushIceQueue(pc);
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: "broadcast",
            event: "rtc-signal",
            payload: { answer }
          });
        }
      });

    } catch (e) {
      console.error("Error answering call:", e);
      endCallCleanup();
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    try {
      if (!isScreenSharing) {
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = screenStream;

        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        videoTrack.onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch (e) {
      console.error("Screen share error:", e);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current && peerConnectionRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    setIsScreenSharing(false);
  };

  const hangUpCall = async () => {
    if (activeTab && currentUser) {
      const targetId = incomingCall ? incomingCall.callerId : activeTab;
      await supabase.channel(`user_signal_${targetId}`).send({
        type: "broadcast",
        event: "call-signal",
        payload: { action: "hangup" }
      });
    }
    endCallCleanup();
  };

  const endCallCleanup = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
    }
    iceCandidateQueue.current = [];
    setIsInCall(false);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && !isScreenSharing) {
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  // --- Chat Messaging Effects ---
  useEffect(() => {
    async function loadMessages() {
      shouldAutoScroll.current = true;
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
        const key = await getSharedKey(currentUser.id, activeTab);
        const { data } = await supabase
          .from("direct_messages")
          .select("*")
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${activeTab}),and(sender_id.eq.${activeTab},receiver_id.eq.${currentUser.id})`)
          .order("created_at", { ascending: true });

        if (data) {
          const decryptedMessages = await Promise.all(
            data.map(async (msg) => {
              const decryptedMessage = await decryptText(msg.message, key);
              let decryptedReply = msg.reply_message;
              if (msg.reply_message) {
                decryptedReply = await decryptText(msg.reply_message, key);
              }
              return { ...msg, message: decryptedMessage, reply_message: decryptedReply };
            })
          );
          setMessages(decryptedMessages);
        }
      }
    }
    if (currentUser) loadMessages();

    const channelName = `chat_${activeTab}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: activeTab === "global" ? "global_chat" : "direct_messages" },
        async (payload) => {
          const msg = payload.new;
          shouldAutoScroll.current = true;

          if (activeTab === "global") {
            const { data: p } = await supabase.from("profiles").select("username").eq("id", msg.user_id).single();
            const newMsgWithProfile = { ...msg, profiles: p };

            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, newMsgWithProfile];
            });

            if (msg.user_id !== currentUser?.id) playNotificationSound();
          } else {
            if (
              currentUser &&
              ((msg.sender_id === currentUser.id && msg.receiver_id === activeTab) ||
               (msg.sender_id === activeTab && msg.receiver_id === currentUser.id))
            ) {
              const key = await getSharedKey(currentUser.id, activeTab);
              const decryptedMessage = await decryptText(msg.message, key);
              let decryptedReply = msg.reply_message;
              if (msg.reply_message) {
                decryptedReply = await decryptText(msg.reply_message, key);
              }
              const processedMsg = { ...msg, message: decryptedMessage, reply_message: decryptedReply };

              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, processedMsg];
              });
              if (msg.sender_id !== currentUser.id) playNotificationSound();
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: activeTab === "global" ? "global_chat" : "direct_messages" },
        (payload) => {
          if (payload.old?.id) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          } else {
            setMessages([]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, currentUser, profileUsername]);

  const sendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !currentUser) return;
    shouldAutoScroll.current = true;

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
      }
    } else {
      const key = await getSharedKey(currentUser.id, activeTab);
      const encryptedMessage = await encryptText(textToSend, key);
      let encryptedReply = null;
      if (replyingTo) {
        encryptedReply = await encryptText(replyingTo.message, key);
      }

      const { data, error } = await supabase.from("direct_messages").insert({
        message: encryptedMessage,
        sender_id: currentUser.id,
        receiver_id: activeTab,
        reply_message: encryptedReply,
        reply_sender: replySenderName,
      }).select().single();

      if (!error && data) {
        const decryptedMsg = {
          ...data,
          message: textToSend,
          reply_message: replyingTo ? replyingTo.message : null,
        };
        setMessages((prev) => [...prev, decryptedMsg]);
        setReplyingTo(null);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    setNewMessage("");
    await sendChatMessage(text);
  };

  const handleDeleteMessage = async (msgId: string, createdAt: string) => {
    const sentTime = new Date(createdAt).getTime();
    const nowTime = new Date().getTime();
    const diffMinutes = (nowTime - sentTime) / (1000 * 60);

    if (!isModerator && diffMinutes > 5) {
      alert("Transmission can only be deleted within 5 minutes of dispatch!");
      return;
    }

    const tableName = activeTab === "global" ? "global_chat" : "direct_messages";
    const { error } = await supabase.from(tableName).delete().eq("id", msgId);

    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    }
  };

  const handleSearchProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = friendUsernameInput.trim().replace("@", "");
    if (!query || !currentUser) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq("id", currentUser.id)
      .limit(10);

    if (error || !data || data.length === 0) {
      setSearchResults([]);
      alert("No operators found matching that name.");
    } else {
      setSearchResults(data);
    }
  };

  const handleSendFriendRequestToUser = async (targetUserId: string) => {
    if (!currentUser) return;
    const { error } = await supabase.from("friendships").insert({
      user_id: currentUser.id,
      friend_id: targetUserId,
      status: "pending",
    });
    if (error) {
      alert("Request already sent or error occurred.");
    } else {
      alert("Secure friend request transmitted!");
      setSearchResults([]);
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

  const handlePurgeGlobalChat = async () => {
    if (!isModerator) return;
    if (!confirm("WARNING: Are you sure you want to purge the entire global network chat?")) return;
    const { error } = await supabase.from("global_chat").delete().gte("created_at", "1970-01-01");
    if (!error) {
      setMessages([]);
      alert("Global network chat has been completely purged.");
    }
  };

  const activeFriendObj = friends.find((f) => f.id === activeTab);

  return (
    <div className="min-h-screen bg-[#020803] text-slate-100 flex flex-col relative">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-4 w-full flex flex-col">
        
        <div className="mb-4 pb-3 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h1 className="text-lg font-black text-white tracking-tight">ASTEROID GAMING-CLOUD // SECURE COMMS</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-500/40 flex items-center gap-1">
              <Lock className="w-3 h-3" /> E2EE ACTIVE (HEX)
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] min-h-[500px] rounded-xl bg-[#061408] border border-emerald-500/40 shadow-xl overflow-hidden relative">
          
          {/* Left Sidebar */}
          <div className="w-full md:w-64 bg-[#030d04] border-r border-emerald-500/30 flex flex-col shrink-0 h-48 md:h-full">
            <form onSubmit={handleSearchProfiles} className="p-2 border-b border-emerald-500/20 flex gap-1">
              <input
                type="text"
                placeholder="Search name / username..."
                value={friendUsernameInput}
                onChange={(e) => setFriendUsernameInput(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-[#020803] border border-emerald-500/30 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
              <button type="submit" className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded cursor-pointer">
                <Search className="w-4 h-4" />
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="p-2 bg-[#020a04] border-b border-emerald-500/30 max-h-36 overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase">Search Results</span>
                  <button onClick={() => setSearchResults([])} className="text-[10px] text-slate-400 hover:text-white">Close</button>
                </div>
                {searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between bg-emerald-950/60 p-1.5 rounded mb-1 border border-emerald-500/30 text-xs">
                    <div className="truncate pr-1">
                      <span className="text-emerald-200 font-bold block truncate">@{user.username}</span>
                    </div>
                    <button
                      onClick={() => handleSendFriendRequestToUser(user.id)}
                      className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded cursor-pointer shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-2">
              <button
                onClick={() => setActiveTab("global")}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold ${
                  activeTab === "global" ? "bg-emerald-500 text-black" : "text-slate-300 hover:bg-emerald-500/10"
                }`}
              >
                <Globe className="w-3.5 h-3.5" /> Global Network
              </button>
            </div>

            {pendingRequests.length > 0 && (
              <div className="px-2 pb-2 border-b border-emerald-500/20">
                <span className="text-[10px] font-mono text-emerald-300 font-bold uppercase block mb-1">Pending Requests</span>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-emerald-950/40 p-1.5 rounded mb-1 border border-emerald-500/30">
                    <span className="text-xs text-emerald-200 truncate">@{req.username}</span>
                    <button onClick={() => handleAcceptRequest(req.id)} className="p-1 bg-emerald-500 hover:bg-emerald-400 text-black rounded text-xs cursor-pointer">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-2 border-b border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold uppercase">
              Friends DMs (Encrypted)
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
                      activeTab === f.id ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold" : "text-slate-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="truncate">@{f.username}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#061408] h-full">
            <div className="px-4 py-2.5 bg-[#040f05] border-b border-emerald-500/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white">
                  {activeTab === "global" ? "global-network" : `@${activeFriendObj?.username || "operator"}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {activeTab !== "global" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startCall('audio')}
                      className="p-1.5 bg-emerald-950 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded cursor-pointer transition"
                      title="Start Audio Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startCall('video')}
                      className="p-1.5 bg-emerald-950 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded cursor-pointer transition"
                      title="Start Video Call"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {activeTab === "global" && isModerator && (
                  <button
                    onClick={handlePurgeGlobalChat}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded text-[11px] font-extrabold cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Purge
                  </button>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={chatContainerRef}
              tabIndex={0}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 focus:outline-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {messages.length === 0 ? (
                <div className="text-center py-16 text-emerald-200/40 font-mono text-xs">
                  No transmissions found in this channel.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = currentUser && (msg.user_id === currentUser.id || msg.sender_id === currentUser.id);
                  const name = activeTab === "global" ? (msg.profiles?.username || profileUsername) : (isMe ? "You" : activeFriendObj?.username);
                  
                  return (
                    <div
                      key={msg.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, msg });
                      }}
                      className={`flex flex-col group relative ${isMe ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] font-mono text-emerald-200/60 mb-0.5 px-1">@{name || "operator"}</span>
                      <div className="flex items-center gap-2 max-w-[75%]">
                        <div className={`px-3 py-2 text-xs font-medium break-words rounded-lg shadow ${isMe ? "bg-emerald-500 text-black rounded-tr-none" : "bg-[#081f0b] border border-emerald-500/30 text-white rounded-tl-none"}`}>
                          {msg.reply_message && (
                            <div className="mb-1.5 p-1.5 rounded bg-black/20 border-l-2 border-emerald-300 text-[10px] opacity-90">
                              <span className="font-bold block text-emerald-300">@{msg.reply_sender || "operator"}</span>
                              <span className="truncate block">{msg.reply_message}</span>
                            </div>
                          )}
                          <div>{msg.message}</div>
                          <span className={`text-[9px] block text-right mt-1 font-mono opacity-70 ${isMe ? "text-emerald-950 font-bold" : "text-emerald-300"}`}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Banner */}
            {replyingTo && (
              <div className="px-3 py-1.5 bg-[#071a09] border-t border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <Reply className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Replying to <strong className="text-emerald-400">@{replyingTo.user_id === currentUser?.id || replyingTo.sender_id === currentUser?.id ? "You" : activeFriendObj?.username}</strong>: {replyingTo.message}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-2.5 bg-[#030d04] border-t border-emerald-500/30 flex gap-2 shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={activeTab === "global" ? "Type message..." : `Secure message @${activeFriendObj?.username}...`}
                className="flex-1 px-3 py-2 rounded bg-[#020803] border border-emerald-500/30 text-white text-xs focus:border-emerald-400 outline-none"
              />
              <button type="submit" className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1 cursor-pointer">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* --- Incoming Call Modal Overlay --- */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#061408] border border-emerald-500 p-6 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-900/50 border border-emerald-500 flex items-center justify-center mb-4 animate-pulse">
              {incomingCall.type === 'video' ? <Video className="w-8 h-8 text-emerald-400" /> : <Phone className="w-8 h-8 text-emerald-400" />}
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Incoming {incomingCall.type.toUpperCase()} Call</h2>
            <p className="text-xs text-emerald-300 font-mono mb-6">Operator @{incomingCall.callerName} is calling...</p>
            <div className="flex gap-4 w-full">
              <button onClick={() => setIncomingCall(null)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg cursor-pointer">Reject</button>
              <button onClick={answerCall} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg cursor-pointer">Accept</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Active Call & Screen Share Overlay --- */}
      {isInCall && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-4xl h-[70vh] bg-[#020803] border border-emerald-500/50 rounded-xl overflow-hidden flex items-center justify-center shadow-2xl">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 right-4 w-40 h-28 bg-black border border-emerald-500 rounded-lg overflow-hidden shadow-lg">
              <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff && !isScreenSharing ? 'hidden' : ''}`} />
              {isVideoOff && !isScreenSharing && <div className="w-full h-full flex items-center justify-center text-[10px] text-emerald-400 font-mono">Camera Off</div>}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-6">
            <button onClick={toggleMute} className={`p-3 rounded-full border border-emerald-500 ${isMuted ? 'bg-red-600 text-white' : 'bg-emerald-950 text-emerald-400'} cursor-pointer`} title={isMuted ? "Unmute Mic" : "Mute Mic"}>
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            {callType === 'video' && (
              <button onClick={toggleVideo} className={`p-3 rounded-full border border-emerald-500 ${isVideoOff && !isScreenSharing ? 'bg-red-600 text-white' : 'bg-emerald-950 text-emerald-400'} cursor-pointer`} title={isVideoOff ? "Turn Video On" : "Turn Video Off"}>
                {isVideoOff && !isScreenSharing ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}
            <button onClick={toggleScreenShare} className={`p-3 rounded-full border border-emerald-500 ${isScreenSharing ? 'bg-emerald-500 text-black font-bold animate-pulse' : 'bg-emerald-950 text-emerald-400'} cursor-pointer`} title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}>
              {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
            </button>
            <button onClick={hangUpCall} className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-lg" title="Hang Up">
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Context Menu Popup */}
      {contextMenu && (
        <div style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-50 bg-[#081f0b] border border-emerald-500/50 rounded-lg shadow-2xl py-1 w-36 text-xs text-slate-200">
          <button onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-emerald-500/20 flex items-center gap-2 text-emerald-300 font-bold cursor-pointer">
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
          {currentUser && ((contextMenu.msg.user_id === currentUser.id || contextMenu.msg.sender_id === currentUser.id) || isModerator) && (
            <button onClick={() => { handleDeleteMessage(contextMenu.msg.id, contextMenu.msg.created_at); setContextMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-red-500/20 flex items-center gap-2 text-red-400 font-bold cursor-pointer border-t border-emerald-500/20">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
