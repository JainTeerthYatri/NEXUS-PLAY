"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Lightbulb, Send, Plus, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react";

// Matrix Green Code Rain Background Component
function MatrixRainBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const characters = "01010101010101010101ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()_+-=[]{}|;:,.<>?";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 12, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#00ff66"; // Hacker green
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-20"
    />
  );
}

export default function SuggestionPage() {
  const [email, setEmail] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Anti-Spam States
  const [pasteTimestamps, setPasteTimestamps] = useState<number[]>([]);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState<string>("");

  useEffect(() => {
    const lockoutUntil = localStorage.getItem("site_lockout_until");
    if (lockoutUntil) {
      const remaining = parseInt(lockoutUntil) - Date.now();
      if (remaining > 0) {
        setIsLockedOut(true);
        startCountdown(parseInt(lockoutUntil));
      } else {
        localStorage.removeItem("site_lockout_until");
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      const now = Date.now();
      const recentPastes = pasteTimestamps.filter(t => now - t < 60000);
      
      if (recentPastes.length >= 3) { 
        const lockoutTime = now + 30 * 60 * 1000; 
        localStorage.setItem("site_lockout_until", lockoutTime.toString());
        setIsLockedOut(true);
        startCountdown(lockoutTime);
        alert("🚨 SPAM ALERT: You have triggered the anti-spam protection by pasting too frequently. You are locked out of website access for 30 minutes.");
      } else {
        setPasteTimestamps([...recentPastes, now]);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [pasteTimestamps]);

  function startCountdown(targetTime: number) {
    const interval = setInterval(() => {
      const remaining = targetTime - Date.now();
      if (remaining <= 0) {
        setIsLockedOut(false);
        localStorage.removeItem("site_lockout_until");
        clearInterval(interval);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setLockoutTimer(`${minutes}m ${seconds}s`);
      }
    }, 1000);
  }

  function handleAddBox() {
    if (suggestions.length < 4) {
      setSuggestions([...suggestions, ""]);
    } else {
      alert("You can create a maximum of 4 suggestion boxes at a time.");
    }
  }

  function handleRemoveBox(index: number) {
    if (suggestions.length > 1) {
      const updated = suggestions.filter((_, i) => i !== index);
      setSuggestions(updated);
    }
  }

  function handleBoxChange(index: number, value: string) {
    const updated = [...suggestions];
    updated[index] = value;
    setSuggestions(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || suggestions.some(s => !s.trim())) {
      alert("Please provide your email and fill out all suggestion boxes.");
      return;
    }

    setLoading(true);
    setSuccessMessage("");

    try {
      const response = await fetch("/api/send-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, suggestions }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Your suggestion has been transferred successfully to the team and they will see your suggestion and they will reply as soon as possible and implement if they acknowledge it.");
        setEmail("");
        setSuggestions([""]);
      } else {
        alert(data.error || "Failed to send suggestion. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting suggestions:", error);
      alert("Network error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (isLockedOut) {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a0c] text-slate-100 flex flex-col items-center justify-center p-4 font-sans relative">
        <MatrixRainBackground />
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#121216]/90 border border-red-500/40 text-center shadow-2xl relative z-10 backdrop-blur-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-xl sm:text-2xl font-black text-white mb-2">Access Temporarily Blocked</h1>
          <p className="text-xs sm:text-sm text-slate-400 mb-6">
            Due to suspicious pasting activity (anti-spam trigger), your access to the website has been paused.
          </p>
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 font-mono text-base sm:text-lg font-bold">
            Timeout Remaining: {lockoutTimer || "30m 0s"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0c] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">
      <MatrixRainBackground />

      <div className="relative z-10 flex flex-col flex-1">
        <Navbar />

        <main className="flex-1 max-w-3xl mx-auto px-3 sm:px-6 py-8 sm:py-12 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 pb-6 border-b border-white/10">
            <div className="p-3 rounded-xl bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 w-fit shrink-0">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Submit Your Suggestions</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Send your ideas directly to our core team review inbox.</p>
            </div>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-start gap-3 shadow-xl backdrop-blur-md">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm leading-relaxed break-words">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-5 sm:p-8 rounded-2xl bg-[#121216]/90 border border-white/10 shadow-2xl flex flex-col gap-6 backdrop-blur-md">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-2">Your Contact Email ID *</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., yourname@gmail.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-xs sm:text-sm text-white outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500 mt-1">The team will reply directly to this email address.</p>
            </div>

            <hr className="border-white/10" />

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Suggestion Boxes ({suggestions.length}/4)
                </label>
                {suggestions.length < 4 && (
                  <button
                    type="button"
                    onClick={handleAddBox}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" /> Add Suggestion Box
                  </button>
                )}
              </div>

              {suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-center gap-3">
                  <textarea
                    rows={2}
                    value={suggestion}
                    onChange={(e) => handleBoxChange(index, e.target.value)}
                    placeholder={`Write suggestion #${index + 1} here...`}
                    required
                    className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-xs sm:text-sm text-white outline-none focus:border-emerald-500 resize-none transition-colors"
                  />
                  {suggestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBox(index)}
                      className="p-3 rounded-xl bg-red-950/50 hover:bg-red-900 border border-red-500/30 text-red-400 transition-colors cursor-pointer shrink-0"
                      title="Remove box"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50 mt-2"
            >
              <Send className="w-4 h-4 shrink-0" /> {loading ? "Transmitting to Team..." : "Submit Suggestions"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
