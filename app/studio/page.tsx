"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { 
  Cpu, Layers, Terminal, Play, Settings, Sparkles, 
  Box, RefreshCw, CheckCircle2, Code, Server, 
  Sliders, Shield, Zap, Layout, Monitor, Smartphone, Tablet
} from "lucide-react";

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<"canvas" | "code" | "logs">("canvas");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSuccess, setBuildSuccess] = useState(false);
  const [devicePreview, setDevicePreview] = useState<"pc" | "tablet" | "mobile">("pc");

  const handleTriggerBuild = () => {
    setIsBuilding(true);
    setBuildSuccess(false);
    setTimeout(() => {
      setIsBuilding(false);
      setBuildSuccess(true);
    }, 2000);
  };

  return (
    <div className="min-h-[100dvh] bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black relative overflow-x-hidden">
      {/* Background Neon Glow Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-6 relative z-10">
        
        {/* Studio Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
              <span className="truncate">STUDIO_NEXT // V1.2_RELEASE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Core Development Studio
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/60 mt-1">
              Neon Blue & Cyan Architecture • Responsive Layout Studio Environment
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Device Preview Switcher for Responsive Testing */}
            <div className="flex items-center bg-[#020617] p-1 rounded-xl border border-cyan-500/20">
              <button
                onClick={() => setDevicePreview("pc")}
                className={`p-2 rounded-lg text-xs transition-all cursor-pointer ${devicePreview === 'pc' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevicePreview("tablet")}
                className={`p-2 rounded-lg text-xs transition-all cursor-pointer ${devicePreview === 'tablet' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}
                title="Tablet View"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevicePreview("mobile")}
                className={`p-2 rounded-lg text-xs transition-all cursor-pointer ${devicePreview === 'mobile' ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleTriggerBuild}
              disabled={isBuilding}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Zap className={`w-4 h-4 ${isBuilding ? 'animate-spin' : ''}`} />
              {isBuilding ? "Compiling v1.2..." : "Deploy Update"}
            </button>
          </div>
        </div>

        {buildSuccess && (
          <div className="p-4 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 flex items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.2)] animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <p className="text-xs sm:text-sm font-mono">
              Build successful! Studio Next v1.2 Neon Blue + Cyan packages compiled and synchronized across all nodes.
            </p>
          </div>
        )}

        {/* Main Workspace Grid (Responsive: Mobile stacked, Tablet/PC multi-column) */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-300 ${
          devicePreview === 'mobile' ? 'max-w-sm mx-auto w-full' :
          devicePreview === 'tablet' ? 'max-w-2xl mx-auto w-full' : 'w-full'
        }`}>
          
          {/* Left Sidebar Tools */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg">
              <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Component Library
              </h2>
              
              <div className="space-y-2">
                {[
                  { name: "Neon Header Bar", icon: Layout },
                  { name: "Cyan Matrix Grid", icon: Box },
                  { name: "Quantum Terminal", icon: Terminal },
                  { name: "Security Shield Node", icon: Shield },
                  { name: "Telemetry Metrics", icon: Cpu }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl bg-[#020617] border border-cyan-500/20 hover:border-cyan-400 text-xs text-slate-300 flex items-center gap-3 transition-all cursor-pointer group"
                  >
                    <item.icon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="font-medium group-hover:text-cyan-300 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0f19]/80 border border-cyan-500/30 backdrop-blur-xl shadow-lg">
              <h2 className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" /> Theme Config
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Primary Accent</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono">Neon Cyan</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Secondary Accent</span>
                  <span className="px-2 py-0.5 rounded bg-blue-600/20 border border-blue-500/40 text-blue-300 font-mono">Deep Blue</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Version</span>
                  <span className="text-white font-mono">v1.2.0-beta</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Canvas / Code Viewer */}
          <div className="lg:col-span-9 flex flex-col gap-4">
            
            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 bg-[#0b0f19]/80 p-1.5 rounded-2xl border border-cyan-500/30 backdrop-blur-xl w-fit">
              <button
                onClick={() => setActiveTab("canvas")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "canvas"
                    ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layout className="w-3.5 h-3.5" /> Visual Canvas
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "code"
                    ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Code className="w-3.5 h-3.5" /> Source Code
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === "logs"
                    ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" /> Build Logs
              </button>
            </div>

            {/* Active Workspace View */}
            <div className="flex-1 min-h-[400px] p-6 rounded-2xl bg-[#0b0f19]/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
              
              {activeTab === "canvas" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
                    <div>
                      <h3 className="font-extrabold text-white text-base">Studio Workspace Preview</h3>
                      <p className="text-xs text-cyan-200/60 font-mono">Live rendering in neon blue & cyan environment.</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400">
                      ONLINE
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#020617] border border-cyan-500/20 hover:border-cyan-400 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-cyan-400">NODE_01</span>
                        <Server className="w-4 h-4 text-cyan-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">Neon Engine v1.2</h4>
                      <p className="text-xs text-slate-400">Optimized shader pipeline with dual cyan-blue illumination.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#020617] border border-blue-500/20 hover:border-blue-400 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-blue-400">NODE_02</span>
                        <Cpu className="w-4 h-4 text-blue-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">Responsive Grid Matrix</h4>
                      <p className="text-xs text-slate-400">Seamless fluid resizing across mobile, tablet, and desktop viewports.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "code" && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-cyan-400 pb-2 border-b border-cyan-500/20">
                    <span>app/studio/page.tsx</span>
                    <span>TypeScript / Tailwind</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#020617] border border-cyan-500/20 text-cyan-200/90 overflow-x-auto leading-relaxed">
{`export default function StudioNextV12() {
  const theme = "neon-blue-cyan";
  const responsive = ["mobile", "tablet", "pc"];
  
  return (
    <div className="bg-[#020617] text-cyan-400">
      <StudioWorkspace theme={theme} targets={responsive} />
    </div>
  );
}`}
                  </pre>
                </div>
              )}

              {activeTab === "logs" && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-cyan-400 pb-2 border-b border-cyan-500/20">
                    <span>Compiler Console</span>
                    <span>Status: Ready</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#020617] border border-cyan-500/20 text-slate-300 space-y-1.5">
                    <p className="text-cyan-400">[09:15:00] Initializing Studio Next v1.2 build sequence...</p>
                    <p className="text-slate-400">[09:15:02] Applying neon blue + cyan theme variables...</p>
                    <p className="text-slate-400">[09:15:05] Verifying responsive layout across mobile, tablet, and PC viewports...</p>
                    <p className="text-cyan-300 font-bold">[09:15:10] Build verified successfully. Ready for deployment.</p>
                  </div>
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-cyan-500/20 flex items-center justify-between text-xs font-mono text-cyan-200/50 flex-wrap gap-2">
                <span>STUDIO_READY</span>
                <span>SECURE_SESSION_ACTIVE</span>
              </div>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
