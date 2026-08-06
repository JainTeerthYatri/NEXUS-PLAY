"use client";

import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { 
  Shield, Terminal, Activity, Search, Filter, 
  Clock, User, Sparkles, Lock, ArrowRight, CheckCircle2 
} from "lucide-react";

type AuditLog = {
  id: string;
  moderator_id: string;
  action_type: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
    role: string;
  } | null;
};

export default function ModeratorLogsPage() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("member");
  const [loadingRole, setLoadingRole] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState("All");

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
        
        if (profile?.role) {
          setUserRole(profile.role);
        }
      }
      setLoadingRole(false);
    }
    init();
  }, [supabase]);

  useEffect(() => {
    if (loadingRole) return;
    const isPrivileged = userRole === "owner" || userRole === "moderator";
    if (!isPrivileged) return;

    async function fetchLogs() {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, profiles(username, display_name, role)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLogs(data as AuditLog[]);
      }
      setLoadingLogs(false);
    }

    fetchLogs();
  }, [loadingRole, userRole, supabase]);

  const availableActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => { if (l.action_type) set.add(l.action_type); });
    return ["All", ...Array.from(set)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target_id?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = selectedActionFilter === "All" || log.action_type === selectedActionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchQuery, selectedActionFilter]);

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-[#080600] text-slate-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center font-mono text-xs text-yellow-400 animate-pulse">
          AUTHENTICATING_MOD_CLEARANCE...
        </div>
      </div>
    );
  }

  const isPrivileged = userRole === "owner" || userRole === "moderator";

  if (!isPrivileged) {
    return (
      <div className="min-h-screen bg-[#080600] text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-12 w-full flex items-center justify-center">
          <div className="max-w-md w-full p-8 rounded-xl bg-[#161004] border border-amber-500/40 text-center shadow-[0_0_30px_rgba(251,191,36,0.1)]">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-yellow-400 mb-4 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Access Denied</h2>
            <p className="text-xs text-amber-200/60 font-mono mb-6">
              Moderator or Owner clearance is required to access audit logs.
            </p>
            <a 
              href="/dashboard"
              className="px-5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
            >
              Return to Dashboard <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080600] text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-amber-500/30">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#161004] border border-amber-500/50 text-xs font-mono text-amber-300 mb-2 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              <span>SYSTEM_AUDIT_LOGS // SECURE_REGISTRY</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              Moderator Audit Logs
            </h1>
            <p className="text-sm text-amber-200/60 mt-1">
              Real-time activity tracking across squads, studio broadcasts, and administrative actions.
            </p>
          </div>

          <div className="px-4 py-2 rounded-xl bg-[#161004] border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center gap-2 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
            <Activity className="w-4 h-4 text-yellow-400" />
            <span>Total Recorded Events: <strong className="text-white">{logs.length}</strong></span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs by action, details, moderator, or target ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#161004] border border-amber-500/30 text-white text-sm focus:border-yellow-400 outline-none transition-colors shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          <span className="text-xs font-mono text-amber-400 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Action Type:
          </span>
          {availableActions.map((actionName) => (
            <button
              key={actionName}
              onClick={() => setSelectedActionFilter(actionName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                selectedActionFilter === actionName
                  ? "bg-yellow-500/20 border border-yellow-400 text-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                  : "bg-[#140e04] border border-amber-500/20 text-amber-200/60 hover:text-amber-300 hover:border-amber-500/40"
              }`}
            >
              {actionName}
            </button>
          ))}
        </div>

        {loadingLogs ? (
          <div className="text-center py-20 text-yellow-400 font-mono text-sm animate-pulse">
            RETRIEVING_AUDIT_RECORDS...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 rounded-xl bg-[#161004] border border-amber-500/40 text-center max-w-md mx-auto my-12 shadow-[0_0_20px_rgba(251,191,36,0.1)]">
            <Terminal className="w-10 h-10 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <h3 className="text-white font-bold mb-1">No Audit Logs Found</h3>
            <p className="text-sm text-amber-200/60">
              {searchQuery || selectedActionFilter !== "All"
                ? "No log entries match your active filters or search query."
                : "No moderator actions recorded in the system yet."}
            </p>
          </div>
        ) : (
          <div className="bg-[#140e04] border border-amber-500/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.06)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1c1305] border-b border-amber-500/30 text-xs font-mono text-amber-300">
                    <th className="py-3 px-4">Action Type</th>
                    <th className="py-3 px-4">Moderator / Operator</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Target ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/15 text-sm">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-amber-500/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-500/40 text-yellow-300 shadow-[0_0_8px_rgba(251,191,36,0.15)] inline-block">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-white">
                              @{log.profiles?.username || "unknown"}
                            </p>
                            <span className="text-[10px] font-mono text-amber-200/50 uppercase">
                              {log.profiles?.role || "moderator"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-amber-100/95 max-w-md font-sans leading-relaxed">
                        {log.details || "No details provided."}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-amber-200/60">
                        {log.target_id ? log.target_id.substring(0, 12) + "..." : "N/A"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-amber-200/70 whitespace-nowrap flex items-center gap-1.5 pt-4">
                        <Clock className="w-3 h-3 text-yellow-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
