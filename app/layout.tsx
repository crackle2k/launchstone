import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hacker Tracker — Hackathon Stats",
  description: "Track hackathon competitors, PR scores, and leaderboards.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white min-h-screen`}>
        <nav className="border-b border-[#222] bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-6">
            <Link href="/" className="font-bold text-lg tracking-tight">
              <span className="text-blue-400">Hacker</span>
              <span className="text-white">Tracker</span>
            </Link>
            <div className="flex gap-4 text-sm text-zinc-400">
              <Link href="/hackathons" className="hover:text-white transition-colors">Hackathons</Link>
              <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
