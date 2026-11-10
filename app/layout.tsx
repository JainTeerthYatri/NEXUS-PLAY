import type { Metadata } from "next";
import "./globals.css";
import CodeRain from "../components/CodeRain";
import Footer from "../components/Footer";

const siteUrl = "https://asteroidgamingcloud.dpdns.org";

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Asteroid Gaming Cloud",
  alternateName: ["AGC", "asteroidgamingcloud.dpdns.org"],
  url: `${siteUrl}/`,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Asteroid Gaming Cloud | Gaming Tools & Community",
    template: "%s | Asteroid Gaming Cloud",
  },

  description:
    "Explore Asteroid Gaming Cloud for AI thumbnail and logo creation, gaming chat, squad matchmaking, gaming highlights and community tools.",

  applicationName: "Asteroid Gaming Cloud",

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Asteroid Gaming Cloud",
    title: "Asteroid Gaming Cloud | Gaming Tools & Community",
    description:
      "Discover AI gaming tools, global gaming chat, squad matchmaking and gaming highlights.",
  },

  twitter: {
    card: "summary",
    title: "Asteroid Gaming Cloud",
    description:
      "AI gaming tools, global community, matchmaking and gaming highlights.",
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </head>

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
