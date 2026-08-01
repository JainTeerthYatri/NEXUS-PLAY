import Link from "next/link";
import { Shield, Lock, FileText, Cookie } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0c] border-t border-white/10 py-8 text-slate-400 text-xs font-mono mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-500" />
          <span className="text-slate-300 font-bold">ASTEROIDCLOUD GRID</span>
          <span className="text-slate-600">|</span>
          <span>© 2026 All Rights Reserved</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300">
          <Link href="/terms" className="hover:text-red-400 transition-colors flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-red-500" /> Terms & Conditions
          </Link>
          <Link href="/privacy" className="hover:text-red-400 transition-colors flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-red-500" /> Privacy Policy
          </Link>
          <Link href="/cookies" className="hover:text-red-400 transition-colors flex items-center gap-1.5">
            <Cookie className="w-3.5 h-3.5 text-red-500" /> Cookie Policy
          </Link>
        </div>

      </div>
    </footer>
  );
}
