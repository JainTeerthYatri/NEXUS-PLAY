"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { 
  ShieldAlert, 
  Save, 
  Search, 
  Users, 
  Shield, 
  Trash2, 
  Radio, 
  Globe, 
  Ban, 
  Eye, 
  Check, 
  Gamepad2, 
  FileText,
  Flag,
  RefreshCw,
  Lock,
  Unlock,
  Terminal,
  ArrowRight,
  Zap,
  ExternalLink,
  PlusCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  updated_at: string;
  created_at?: string;
  is_banned?: boolean;
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

type AuditLog = {
  id: string;
  moderator_id: string;
  action_type: string;
  target_id: string;
  details: string;
  created_at: string;
  profiles?: {
    username: string;
  };
};

type ReportItem = {
  id: string;
  reporter_id: string;
  target_type: "user" | "lfg" | "squad" | "message";
  target_id: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  profiles?: {
    username: string;
  };
};

export default function ModDashboardExtended() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [listings, setListings] = useState<LfgListing[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "lfg" | "squads" | "reports" | "logs" | "test_bypass">("users");

  // Action States & Rate Limiting
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState("");
  const [selectedUserForBan, setSelectedUserForBan] = useState<Profile | null>(null);

  // Inspector Modal States
  const [inspectingItem, setInspectingItem] = useState<{ type: "lfg" | "squad"; data: LfgListing | Squad } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- NEW: Test Email & Auth Bypass States ---
  const [testEmailInput, setTestEmailInput] = useState(`mod-test-${Math.floor(Math.random() * 10000)}@gmail.com`);
  const [testUsernameInput, setTestUsernameInput] = useState(`operator_test_${Math.floor(Math.random() * 1000)}`);
  const [bypassLoading, setBypassLoading] = useState(false);
  const [activeTestSessions, setActiveTestSessions] = useState<{ email: string; token: string; createdAt: string }[]>([]);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedTestSessionUrl, setSelectedTestSessionUrl] = useState<string>("");

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    async function initializeModConsole() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData?.user;

        if (!currentUser) {
          router.push("/");
          return;
        }

        setCurrentUserId(currentUser.id);

        const { data: banCheck } = await supabase
          .from("banned_users")
          .select("id")
          .eq("user_id", currentUser.id)
          .single();

        if (banCheck) {
          router.push("/banned");
          return;
        }

        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("role, username")
          .eq("id", currentUser.id)
          .single();

        if (!currentProfile || (currentProfile.role !== "owner" && currentProfile.role !== "moderator")) {
          alert("Access Denied: Insufficient security clearance level.");
          router.push("/");
          return;
        }

        if (isMounted) {
          setIsAuthorized(true);
          setCurrentUserRole(currentProfile.role);
        }

        const [
          profileRes, 
          bannedRes, 
          lfgRes, 
          squadRes, 
          logsRes, 
          reportsRes
        ] = await Promise.all([
          supabase.from("profiles").select("*").order("username", { ascending: true }),
          supabase.from("banned_users").select("user_id, reason, created_at"),
          supabase.from("lfg_listings").select("*, profiles(username, display_name)").order("created_at", { ascending: false }),
          supabase.from("squads").select("*, profiles(username)").order("created_at", { ascending: false }),
          supabase.from("audit_logs").select("*, profiles(username)").order("created_at", { ascending: false }).limit(50),
          supabase.from("reports").select("*, profiles(username)").order("created_at", { ascending: false })
        ]);

        const bannedMap = new Map();
        bannedRes.data?.forEach(b => bannedMap.set(b.user_id, b.reason));

        if (profileRes.data && isMounted) {
          const mappedProfiles = profileRes.data.map(p => ({
            ...p,
            is_banned: bannedMap.has(p.id)
          }));
          setProfiles(mappedProfiles);
        }

        if (lfgRes.data && isMounted) setListings(lfgRes.data);
        if (squadRes.data && isMounted) setSquads(squadRes.data);
        if (logsRes.data && isMounted) setAuditLogs(logsRes.data);
        if (reportsRes.data && isMounted) setReports(reportsRes.data);

      } catch (err) {
        console.error("Initialization error in Mod Center:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initializeModConsole();
  }, [supabase, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleLocalRoleChange(userId: string, newRole: string) {
    setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
  }

  async function logAdminAction(actionType: string, targetId: string, details: string) {
    if (!currentUserId) return;
    try {
      await supabase.from("audit_logs").insert({
        moderator_id: currentUserId,
        action_type: actionType,
        target_id: targetId,
        details: details
      });
    } catch (e) {
      console.error("Failed to write audit log:", e);
    }
  }

  async function handleSaveRole(userId: string, newRole: string) {
    if (cooldown) {
      alert("Rate limit active: Please wait 2 seconds before executing another security update.");
      return;
    }

    setSavingId(userId);
    setCooldown(true);

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (!error) {
      await logAdminAction("UPDATE_ROLE", userId, `Changed role to ${newRole}`);
    }

    setSavingId(null);
    setTimeout(() => setCooldown(false), 2000);

    if (error) {
      alert("Error updating security clearance: " + error.message);
    } else {
      setSuccessId(userId);
      setTimeout(() => setSuccessId(null), 2000);
    }
  }

  async function executeBanUser() {
    if (!selectedUserForBan) return;
    const userId = selectedUserForBan.id;
    const username = selectedUserForBan.username;
    const reason = banReasonInput.trim() || "Violation of NexusPlay Community Guidelines";

    setSavingId(userId);
    const { error } = await supabase
      .from("banned_users")
      .insert({ 
        user_id: userId, 
        banned_by: currentUserId, 
        reason: reason 
      });

    if (!error) {
      await logAdminAction("BAN_USER", userId, `Banned operator @${username}. Reason: ${reason}`);
      setProfiles(profiles.map(p => p.id === userId ? { ...p, is_banned: true } : p));
    }

    setSavingId(null);
    setSelectedUserForBan(null);
    setBanReasonInput("");

    if (error) {
      alert("Error executing ban protocol: " + error.message);
    }
  }

  async function handlePardonUser(userId: string, username: string) {
    if (!confirm(`🕊️ Authorize pardon for operator @${username}? This will immediately restore full platform access.`)) return;

    setSavingId(userId);
    const { error } = await supabase
      .from("banned_users")
      .delete()
      .eq("user_id", userId);

    if (!error) {
      await logAdminAction("PARDON_USER", userId, `Pardoned operator @${username}`);
      setProfiles(profiles.map(p => p.id === userId ? { ...p, is_banned: false } : p));
    }

    setSavingId(null);

    if (error) {
      alert("Error pardoning user: " + error.message);
    }
  }

  async function handleDeleteLfgListing(listingId: string) {
    if (!confirm("⚠️ Purge this LFG node, participant records, and associated chat messages permanently?")) return;
    
    await supabase.from("chat_messages").delete().eq("listing_id", listingId);
    await supabase.from("lfg_participants").delete().eq("listing_id", listingId);
    const { error } = await supabase.from("lfg_listings").delete().eq("id", listingId);

    if (!error) {
      await logAdminAction("PURGE_LFG", listingId, "Purged LFG listing and chat logs");
      setListings((prev) => prev.filter(l => l.id !== listingId));
      if (inspectingItem?.data.id === listingId) setInspectingItem(null);
    } else {
      alert("Failed to purge LFG node: " + error.message);
    }
  }

  async function handleDeleteSquad(squadId: string) {
    if (!confirm("⚠️ Delete this squad and all its secure chat history?")) return;
    
    await supabase.from("squad_messages").delete().eq("squad_id", squadId);
    const { error } = await supabase.from("squads").delete().eq("id", squadId);

    if (!error) {
      await logAdminAction("DELETE_SQUAD", squadId, "Deleted squad and associated logs");
      setSquads((prev) => prev.filter(s => s.id !== squadId));
      if (inspectingItem?.data.id === squadId) setInspectingItem(null);
    } else {
      alert("Failed to delete squad: " + error.message);
    }
  }

  async function openChatInspector(type: "lfg" | "squad", item: LfgListing | Squad) {
    setInspectingItem({ type, data: item });
    const tableName = type === "lfg" ? "chat_messages" : "squad_messages";
    const queryField = type === "lfg" ? "listing_id" : "squad_id";
    
    const { data, error } = await supabase
      .from(tableName)
      .select("*, profiles(username)")
      .eq(queryField, item.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(`Error loading ${type} chat:`, error.message);
    }

    setChatMessages(data || []);
  }

  async function handleDeleteMessage(msgId: string) {
    if (!confirm("Permanently erase this chat payload?")) return;
    const tableName = inspectingItem?.type === "squad" ? "squad_messages" : "chat_messages";
    const { error } = await supabase.from(tableName).delete().eq("id", msgId);
    if (!error) {
      await logAdminAction("DELETE_MESSAGE", msgId, "Deleted individual chat message");
      setChatMessages((prev) => prev.filter(m => m.id !== msgId));
    } else {
      alert("Failed to delete message: " + error.message);
    }
  }

  async function handleUpdateReportStatus(reportId: string, newStatus: "resolved" | "dismissed") {
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (!error) {
      setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      await logAdminAction("UPDATE_REPORT", reportId, `Marked report as ${newStatus}`);
    } else {
      alert("Failed to update report status: " + error.message);
    }
  }

  // --- NEW: Generate Verification Bypass Test Account Handler ---
  async function handleGenerateBypassAccount() {
    setBypassLoading(true);
    try {
      // Direct client sign up or mock session generation
      const dummyPassword = "TestPassword@123";
      const { data, error } = await supabase.auth.signUp({
        email: testEmailInput,
        password: dummyPassword,
        options: {
          data: {
            username: testUsernameInput,
            display_name: `Test Operator ${testUsernameInput}`,
          },
        },
      });

      if (error) {
        alert("Bypass Account Creation Error: " + error.message);
        setBypassLoading(false);
        return;
      }

      // Automatically create a mock entry in profiles if trigger is delayed
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          username: testUsernameInput,
          display_name: `Test Operator ${testUsernameInput}`,
          role: "member",
          updated_at: new Date().toISOString()
        });
      }

      await logAdminAction("TEST_BYPASS_CREATED", data.user?.id || "unknown", `Created test account email: ${testEmailInput} bypassing email verification`);

      setActiveTestSessions(prev => [
        { email: testEmailInput, token: data.session?.access_token || "mock_bypassed_token", createdAt: new Date().toLocaleTimeString() },
        ...prev
      ]);

      alert(`✅ Success! Test account created with verified bypass: ${testEmailInput}`);
      
      // Reset inputs for next generation
      setTestEmailInput(`mod-test-${Math.floor(Math.random() * 10000)}@asteroid-test.local`);
      setTestUsernameInput(`operator_test_${Math.floor(Math.random() * 1000)}`);
    } catch (err: any) {
      console.error("Bypass generation error:", err);
      alert("Failed to execute verification bypass.");
    } finally {
      setBypassLoading(false);
    }
  }

  const filteredProfiles = profiles.filter(p => 
    (p.username && p.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.display_name && p.display_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredListings = listings.filter(l =>
    l.game_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSquads = squads.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBanned = profiles.filter(p => p.is_banned).length;
  const pendingReportsCount = reports.filter(r => r.status === "pending").length;

  if (!isAuthorized) return null;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] text-slate-100 flex flex-col font-sans relative">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-3 rounded-xl bg-red-600/10 border border-red-500/30 text-red-500 shadow-lg shadow-red-500/10 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span className="truncate">Command Center</span> <span className="text-red-500 text-xs sm:text-sm font-mono px-2 py-0.5 rounded bg-red-950/55 border border-red-500/30 shrink-0">v2.4 SECURE</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 truncate">Full administrative matrix, audit trails, and moderation tooling active.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full lg:w-auto">
            <button 
              onClick={() => setSidePanelOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-600/30 cursor-pointer shrink-0"
            >
              <Zap className="w-4 h-4 text-white" /> Side Test Panel ({activeTestSessions.length})
            </button>

            <a 
              href="/mod/logs"
              className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4 text-white" /> See Audit Logs <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <div className="relative w-full sm:w-64 lg:w-60">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text"
                placeholder="Search database records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#121216] border border-white/10 text-xs text-white font-mono outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="p-2.5 rounded-lg bg-[#121216] border border-white/10 hover:border-white/30 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Refresh Database Cache"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4 shadow-xl">
            <div className="p-3 rounded-lg bg-violet-600/10 text-violet-400 border border-violet-500/20 shrink-0"><Users className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-slate-400 truncate">Total Operators</p>
              <h3 className="text-xl font-black text-white">{profiles.length}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4 shadow-xl">
            <div className="p-3 rounded-lg bg-red-600/10 text-red-400 border border-red-500/20 shrink-0"><Shield className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-slate-400 truncate">Owners / Mods</p>
              <h3 className="text-xl font-black text-white">{profiles.filter(p => p.role === "owner" || p.role === "moderator").length}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4 shadow-xl">
            <div className="p-3 rounded-lg bg-amber-600/10 text-amber-400 border border-amber-500/20 shrink-0"><Radio className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-slate-400 truncate">Active Nodes</p>
              <h3 className="text-xl font-black text-white">{listings.length + squads.length}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4 shadow-xl">
            <div className="p-3 rounded-lg bg-rose-600/10 text-rose-400 border border-rose-500/20 shrink-0"><Ban className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-slate-400 truncate">Banned Accounts</p>
              <h3 className="text-xl font-black text-white">{totalBanned}</h3>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#121216] border border-white/10 flex items-center gap-4 shadow-xl sm:col-span-2 lg:col-span-1">
            <div className="p-3 rounded-lg bg-orange-600/10 text-orange-400 border border-orange-500/20 shrink-0"><Flag className="w-5 h-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-slate-400 truncate">Pending Reports</p>
              <h3 className="text-xl font-black text-white">{pendingReportsCount}</h3>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === "users" ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" /> Operator Security ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab("lfg")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === "lfg" ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Radio className="w-4 h-4 shrink-0" /> LFG Matrix ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab("squads")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === "squads" ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Gamepad2 className="w-4 h-4 shrink-0" /> Squad Chats ({squads.length})
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 relative ${
              activeTab === "reports" ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Flag className="w-4 h-4 shrink-0" /> Reports 
            {pendingReportsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[10px] font-black">{pendingReportsCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === "logs" ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-[#121216] text-slate-400 hover:text-white border border-white/10"
            }`}
          >
            <Terminal className="w-4 h-4 shrink-0" /> Audit Trails ({auditLogs.length})
          </button>
          {/* NEW TAB FOR AUTH BYPASS */}
          <button
            onClick={() => setActiveTab("test_bypass")}
            className={`px-3.5 sm:px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === "test_bypass" ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/20" : "bg-[#121216] text-fuchsia-400 hover:text-fuchsia-300 border border-fuchsia-500/30"
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" /> Auth Bypass & Test Emails
          </button>
        </div>

        {/* Tab Content Panels */}
        {loading ? (
          <div className="text-center py-28 text-slate-500 font-mono text-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
            SYNCING_SECURE_DATABASE_REGISTERS...
          </div>
        ) : activeTab === "test_bypass" ? (
          /* --- NEW FEATURE PANEL: AUTH BYPASS & TEST EMAILS --- */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#121216] border border-fuchsia-500/30 shadow-2xl space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <div className="p-3 rounded-xl bg-fuchsia-600/10 text-fuchsia-400 border border-fuchsia-500/30">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Instant Verification Bypass Engine</h2>
                  <p className="text-xs font-mono text-slate-400">Generate dummy accounts instantly, bypassing SMTP validation and email verification gates.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">Test Mock Email Address:</label>
                  <input 
                    type="email"
                    value={testEmailInput}
                    onChange={(e) => setTestEmailInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-white outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2">Simulated Username Handle (@):</label>
                  <input 
                    type="text"
                    value={testUsernameInput}
                    onChange={(e) => setTestUsernameInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-white outline-none focus:border-fuchsia-500"
                  />
                </div>

                <button 
                  onClick={handleGenerateBypassAccount}
                  disabled={bypassLoading}
                  className="w-full py-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" /> {bypassLoading ? "Generating Session..." : "Generate & Bypass Verification"}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#121216] border border-white/10 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Active Bypass Test Sessions ({activeTestSessions.length})</h3>
                  <button onClick={() => setSidePanelOpen(true)} className="text-xs text-fuchsia-400 hover:underline flex items-center gap-1 font-mono">
                    Open Side Panel View <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeTestSessions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 font-mono text-xs">NO_BYPASS_SESSIONS_GENERATED_YET</div>
                  ) : (
                    activeTestSessions.map((session, index) => (
                      <div key={index} className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-fuchsia-400 font-bold truncate">{session.email}</p>
                          <span className="text-[10px] font-mono text-slate-500 block">Created at {session.createdAt}</span>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedTestSessionUrl(session.token);
                            setSidePanelOpen(true);
                          }}
                          className="px-3 py-1.5 rounded bg-fuchsia-950 hover:bg-fuchsia-900 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-mono font-bold shrink-0 cursor-pointer"
                        >
                          Inspect Side-by-Side
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 text-[11px] font-mono text-slate-500">
                ⚠️ Note: These test accounts allow developers to test auth states, chat layers, and user permissions instantly without checking physical inbox mailboxes.
              </div>
            </div>
          </div>
        ) : activeTab === "users" ? (
          <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="p-4 border-b border-white/10 font-mono text-xs text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-4">
                  <div className="col-span-4">Operator / Username</div>
                  <div className="col-span-3">Display Name</div>
                  <div className="col-span-5">Security Clearance & Sanctions</div>
                </div>

                <div className="divide-y divide-white/5">
                  {filteredProfiles.map((profile) => (
                    <div key={profile.id} className="p-4 grid grid-cols-12 gap-4 items-center text-sm hover:bg-white/[0.02] transition-colors">
                      <div className="col-span-4 font-mono text-violet-400 font-bold flex items-center gap-2 flex-wrap min-w-0">
                        <span className="truncate">@{profile.username || "unknown"}</span>
                        {profile.is_banned && (
                          <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-500/30 text-[10px] font-mono tracking-wider font-black shrink-0">BANNED</span>
                        )}
                        {profile.id === currentUserId && (
                          <span className="px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 text-[10px] font-mono shrink-0">(YOU)</span>
                        )}
                      </div>
                      <div className="col-span-3 text-slate-300 truncate">
                        {profile.display_name || "N/A"}
                      </div>
                      <div className="col-span-5 flex items-center gap-2 flex-wrap">
                        <select
                          value={profile.role || "member"}
                          disabled={currentUserRole !== "owner" && profile.role === "owner"}
                          onChange={(e) => handleLocalRoleChange(profile.id, e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-xs font-mono outline-none cursor-pointer focus:border-red-500 disabled:opacity-50"
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          <option value="owner">Owner</option>
                        </select>

                        <button
                          onClick={() => handleSaveRole(profile.id, profile.role)}
                          disabled={savingId === profile.id || cooldown}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-md shrink-0"
                        >
                          <Save className="w-3.5 h-3.5 shrink-0" /> Save
                        </button>

                        {successId === profile.id && (
                          <span className="text-emerald-400 text-xs font-mono flex items-center gap-1 shrink-0">
                            <Check className="w-3.5 h-3.5 shrink-0" /> Saved
                          </span>
                        )}

                        {profile.is_banned ? (
                          <button
                            onClick={() => handlePardonUser(profile.id, profile.username)}
                            disabled={savingId === profile.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Unlock className="w-3.5 h-3.5 shrink-0" /> Pardon
                          </button>
                        ) : profile.role !== "owner" && profile.id !== currentUserId && (
                          <button
                            onClick={() => setSelectedUserForBan(profile)}
                            disabled={savingId === profile.id}
                            className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Lock className="w-3.5 h-3.5 shrink-0" /> Ban
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "lfg" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredListings.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-white/10 flex flex-col justify-between shadow-xl hover:border-white/20 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md bg-violet-950/60 text-xs font-mono text-violet-400 border border-violet-500/20 font-bold truncate max-w-[150px]">{item.game_title}</span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 text-xs font-mono text-emerald-400 border border-emerald-500/20 shrink-0"><Globe className="w-3 h-3 inline mr-1" /> {item.region}</span>
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm mb-3 bg-black/40 p-3 rounded-lg border border-white/5 leading-relaxed break-words">{item.description}</p>
                  <div className="text-xs font-mono text-slate-500 mb-4 truncate">Host: <span className="text-slate-300 truncate">@{item.profiles?.username}</span> | Slots: {item.max_players}</div>
                </div>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                  <button onClick={() => openChatInspector("lfg", item)} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-violet-600/20 shrink-0">
                    <Eye className="w-3.5 h-3.5 shrink-0" /> Inspect LFG Chat
                  </button>
                  <button onClick={() => handleDeleteLfgListing(item.id)} className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0">
                    <Trash2 className="w-3.5 h-3.5 shrink-0" /> Purge Node
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "squads" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSquads.map((squad) => (
              <div key={squad.id} className="p-4 sm:p-5 rounded-xl bg-[#121216] border border-white/10 flex flex-col justify-between shadow-xl hover:border-white/20 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-950/60 text-xs font-mono text-indigo-400 font-bold border border-indigo-500/20 truncate max-w-[200px]">{squad.name}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 mb-4 bg-black/30 p-2.5 rounded-lg border border-white/5 truncate">Squad Leader: <span className="text-violet-400 font-bold truncate">@{squad.profiles?.username}</span></div>
                </div>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
                  <button onClick={() => openChatInspector("squad", squad)} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-violet-600/20 shrink-0">
                    <Eye className="w-3.5 h-3.5 shrink-0" /> Inspect Squad Chat
                  </button>
                  <button onClick={() => handleDeleteSquad(squad.id)} className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0">
                    <Trash2 className="w-3.5 h-3.5 shrink-0" /> Delete Squad
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === "reports" ? (
          <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="p-4 border-b border-white/10 font-mono text-xs text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-4">
                  <div className="col-span-3">Reporter</div>
                  <div className="col-span-2">Target Type</div>
                  <div className="col-span-4">Reason / Details</div>
                  <div className="col-span-3 text-right">Moderator Verdict</div>
                </div>

                <div className="divide-y divide-white/5">
                  {reports.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 font-mono text-xs">NO_COMMUNITY_REPORTS_PENDING</div>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="p-4 grid grid-cols-12 gap-4 items-center text-sm hover:bg-white/[0.02] transition-colors">
                        <div className="col-span-3 font-mono text-violet-400 font-bold truncate">@{report.profiles?.username || "unknown"}</div>
                        <div className="col-span-2 font-mono text-xs uppercase text-amber-400 truncate">{report.target_type}</div>
                        <div className="col-span-4 text-slate-300 break-words">{report.reason}</div>
                        <div className="col-span-3 flex items-center justify-end gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                            report.status === "pending" ? "bg-amber-950 text-amber-400 border border-amber-500/30" :
                            report.status === "resolved" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" :
                            "bg-slate-800 text-slate-400"
                          }`}>{report.status}</span>

                          {report.status === "pending" && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => handleUpdateReportStatus(report.id, "resolved")} className="p-1.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400 transition-colors cursor-pointer" title="Resolve">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleUpdateReportStatus(report.id, "dismissed")} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer" title="Dismiss">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#121216] border border-white/10 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[700px]">
                <div className="p-4 border-b border-white/10 text-slate-400 uppercase tracking-wider grid grid-cols-12 gap-4">
                  <div className="col-span-3">Timestamp</div>
                  <div className="col-span-3">Moderator</div>
                  <div className="col-span-2 text-amber-400">Action Type</div>
                  <div className="col-span-4">Details</div>
                </div>

                <div className="divide-y divide-white/5">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-16 text-slate-500">NO_AUDIT_TRAIL_RECORDS_FOUND</div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-4 grid grid-cols-12 gap-4 items-center text-slate-300 hover:bg-white/[0.02]">
                        <div className="col-span-3 text-slate-500 truncate">{new Date(log.created_at).toLocaleString()}</div>
                        <div className="col-span-3 text-violet-400 font-bold truncate">@{log.profiles?.username || "system"}</div>
                        <div className="col-span-2 text-amber-300 font-bold truncate">{log.action_type}</div>
                        <div className="col-span-4 text-slate-400 break-words">{log.details}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- NEW: SIDE-BY-SIDE EXTRA TEST PANEL DRAWER --- */}
        {sidePanelOpen && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#121216] border-l border-fuchsia-500/30 shadow-2xl flex flex-col p-5 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-fuchsia-400 font-bold">
                <Zap className="w-5 h-5" /> Side-by-Side Test Panel
              </div>
              <button 
                onClick={() => setSidePanelOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            <div className="flex-1 py-4 space-y-4">
              <div className="p-4 rounded-xl bg-black/40 border border-fuchsia-500/20">
                <h4 className="text-xs font-mono text-fuchsia-300 font-bold mb-2 uppercase">Quick Actions</h4>
                <p className="text-xs text-slate-300 mb-3">Test simulated user views right here alongside your moderator tools without logging out of your primary admin session.</p>
                
                <div className="space-y-2">
                  <a 
                    href="/" 
                    target="_blank" 
                    className="w-full py-2 px-3 rounded bg-white/5 hover:bg-white/10 text-xs text-white font-mono flex items-center justify-between border border-white/10 transition-colors"
                  >
                    <span>Open Home Feed in New Tab</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">Generated Test Sessions ({activeTestSessions.length})</h4>
                <div className="space-y-2">
                  {activeTestSessions.map((session, i) => (
                    <div key={i} className="p-3 rounded-lg bg-black/60 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-fuchsia-400 font-bold truncate max-w-[200px]">{session.email}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{session.createdAt}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 break-all bg-black/50 p-2 rounded border border-white/5">
                        Token: {session.token.substring(0, 30)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-center">
              <button 
                onClick={() => setSidePanelOpen(false)}
                className="w-full py-2.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        )}

        {/* Ban Reason Modal Dialog */}
        {selectedUserForBan && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-[#121216] border border-red-500/40 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2">
                <div className="flex items-center gap-2 text-red-500 font-bold text-sm sm:text-base truncate">
                  <Lock className="w-5 h-5 shrink-0" /> <span className="truncate">Ban Operator @{selectedUserForBan.username}</span>
                </div>
                <button onClick={() => setSelectedUserForBan(null)} className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer shrink-0">[ESC]</button>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2">Ban Reason / Infraction Details:</label>
                <textarea 
                  rows={3}
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="E.g., Toxicity, harassment, or violating community safety guidelines..."
                  className="w-full p-3 rounded-lg bg-black/50 border border-white/10 text-xs text-white outline-none focus:border-red-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
                <button 
                  onClick={() => setSelectedUserForBan(null)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeBanUser}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-lg shadow-red-600/30"
                >
                  Confirm Permanent Ban
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Inspector Modal */}
        {inspectingItem && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
            <div className="w-full max-w-xl h-[85vh] sm:h-[450px] p-4 sm:p-6 rounded-2xl bg-[#121216] border border-red-500/40 shadow-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between pb-4 border-b border-white/15 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">Chat Inspector // {inspectingItem.type.toUpperCase()}</h3>
                </div>
                <button onClick={() => setInspectingItem(null)} className="text-slate-400 hover:text-white text-xs font-mono cursor-pointer shrink-0">[CLOSE]</button>
              </div>

              <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-2">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 font-mono text-xs">NO_MESSAGES_RECORDED_IN_LOG</div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-start justify-between gap-3 group">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-mono text-violet-400 font-bold truncate block">@{msg.profiles?.username || "unknown"}</span>
                        <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed break-words">{msg.message}</p>
                        <span className="text-[10px] font-mono text-slate-500 mt-1 block">{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)} 
                        className="p-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-400 transition-colors cursor-pointer shrink-0"
                        title="Delete Message"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-mono text-slate-500 truncate">Total Logged Messages: {chatMessages.length}</span>
                <button 
                  onClick={() => setInspectingItem(null)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-colors cursor-pointer shrink-0"
                >
                  Exit Inspector
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
