
import type { Metadata } from "next";
import "./globals.css";
import CodeRain from "../components/CodeRain";
import Footer from "../components/Footer";

const siteUrl = "https://asteroidgamingcloud.dpdns.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Asteroid Gaming Cloud | Gaming Tools & Community",
    template: "%s | Asteroid Gaming Cloud",
  },
  description:
    "Discover Asteroid Gaming Cloud: gaming community, AI thumbnail and logo tools, global gaming chat, LFG matchmaking and gaming highlights.",
  applicationName: "Asteroid Gaming Cloud",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Asteroid Gaming Cloud",
    title: "Asteroid Gaming Cloud | Gaming Tools & Community",
    description:
      "Explore gaming tools, global chat, squad matchmaking and gaming highlights.",
  },
  twitter: {
    card: "summary",
    title: "Asteroid Gaming Cloud",
    description:
      "Gaming tools, global community, matchmaking and highlights.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#0a0a0c] text-slate-100">
      <body className="bg-[#0a0a0c] text-slate-100 min-h-screen flex flex-col relative selection:bg-purple-500 selection:text-white">
        <CodeRain />
        <div className="relative z-10 flex flex-col min-h-screen">
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
