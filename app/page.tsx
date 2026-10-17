"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";
import { 
  Trophy, Users, Radio, ArrowRight, Terminal, Zap, 
  Video, Sparkles, LayoutDashboard 
} from "lucide-react";

// GiftIntro ko dynamic import karo (SSR avoid)
const GiftIntro = dynamic(() => import("@/components/GiftIntro"), {
  ssr: false,
});

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introReady, setIntroReady] = useState(false);

  const supabase = createClient();

  // localStorage check
  useEffect(() => {
    const seen = localStorage.getItem("astroid-gift-seen");
    if (seen === "true") {
      setShowIntro(false);
    }
    setIntroReady(true);
  }, []);

  // Auth check (same as pehle)
  useEffect(() => {
    async function checkUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (data) setProfile(data);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    }
    checkUserSession();
  }, [supabase]);

  // Matrix rain (sirf intro ke baad)
  useEffect(() => {
    if (showIntro) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasDimensions();

    const letters = "0101010101XYZTECHMATRIX_ASTEROIDGAMINGCLOUD";
    const fontSize = 14;
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array.from({ length: columns }).fill(1) as number[];

    const handleResize = () => {
      setCanvasDimensions();
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }).fill(1) as number[];
    };
    window.addEventListener("resize", handleResize);

    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 12, 0.12)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#10b981";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = letters.charAt(Math.floor(Math.random() * letters.length));
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
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [showIntro]);

  const handleIntroComplete = () => {
    localStorage.setItem("astroid-gift-seen", "true");
    setShowIntro(false);
  };

  // Jab tak localStorage check nahi hua
  if (!introReady) {
    return <div className="fixed inset-0 bg-[#0a0a0c]" />;
  }

  // Intro dikhao
  if (showIntro) {
    return <GiftIntro onComplete={handleIntroComplete} />;
  }

  // ─── Tumhara original page ───
  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 flex flex-col relative overflow-x-hidden">
      
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full pointer-events-none opacity-40 z-0" 
      />

      <div className="absolute inset-4 sm:inset-8 pointer-events-none z-1 border border-emerald-500/20 rounded-2xl overflow-hidden shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]">
        <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-emerald-500 to-transparent shadow-[0_0_15px_#10b981]" />
        <div className="absolute top-0 left-0 w-1 h-32 bg-gradient-to-b from-emerald-500 to-transparent shadow-[0_0_15px_#10b981]" />
        <div className="absolute bottom-0 right-0 w-32 h-1 bg-gradient-to-l from-purple-500 to-transparent shadow-[0_0_15px_#a855f7]" />
        <div className="absolute bottom-0 right-0 w-1 h-32 bg-gradient-to-t from-purple-500 to-transparent shadow-[0_0_15px_#a855f7]" />
      </div>

      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 relative z-10 w-full max-w-7xl mx-auto">
        {/* Yahan tumhara pura original user / guest content same rehne do */}
        {user ? (
          // ... logged in content
          <div>Welcome back content...</div>
        ) : (
          // ... guest content
          <div>Guest content...</div>
        )}
      </main>
    </div>
  );
}