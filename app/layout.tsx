import type { Metadata } from "next";
import "./globals.css";
import CodeRain from "../components/CodeRain";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "ASTEROID GAMING-CLOUD // Gaming Telemetry & Squad Network",
  description: "Professional gaming matchmaking, squad directory, and highlight vault.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#0a0a0c] text-slate-100">
      <body className="bg-[#0a0a0c] text-slate-100 min-h-screen flex flex-col relative selection:bg-purple-500 selection:text-white">
        
        {/* Universal Hacking Code Rain Background */}
        <CodeRain />

        {/* App Content Layer */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          
          {/* Global Footer attached to all pages */}
          <Footer />
        </div>

      </body>
    </html>
  );
}
