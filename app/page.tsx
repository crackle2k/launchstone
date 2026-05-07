"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HackathonCard } from "@/components/HackathonCard";
import { HackerCard } from "@/components/HackerCard";
import { useRecentHackathons, useTopHackers } from "@/hooks/useData";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { hackathons, loading: hLoading } = useRecentHackathons(6);
  const { hackers, loading: rLoading } = useTopHackers(5);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const username = query.trim();
    if (username) router.push(`/${username}`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 space-y-20">
      {/* Hero */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Live hackathon stats
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Track any{" "}
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            hacker&apos;s
          </span>{" "}
          stats
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Search any Devpost username to see their hackathon history, PR score, global rank, and more.
        </p>
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a Devpost username..."
            className="bg-[#111] border-[#333] text-white placeholder:text-zinc-500 h-12 text-base focus-visible:ring-blue-500"
          />
          <Button
            type="submit"
            className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium"
          >
            Search
          </Button>
        </form>
      </section>

      {/* Recent Hackathons */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent Hackathons</h2>
          <Link href="/hackathons" className="text-sm text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>
        {hLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-[#111] rounded-xl border border-[#222] animate-pulse" />
            ))}
          </div>
        ) : hackathons.length === 0 ? (
          <EmptyState message="No hackathons yet. Add one via the scraper." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hackathons.map((h) => <HackathonCard key={h.id} hackathon={h} />)}
          </div>
        )}
      </section>

      {/* Top Hackers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Top Hackers</h2>
          <Link href="/leaderboard" className="text-sm text-blue-400 hover:text-blue-300">
            Full leaderboard →
          </Link>
        </div>
        {rLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-[#111] rounded-xl border border-[#222] animate-pulse" />
            ))}
          </div>
        ) : hackers.length === 0 ? (
          <EmptyState message="No hackers tracked yet." />
        ) : (
          <div className="space-y-2">
            {hackers.map((h, i) => <HackerCard key={h.id} hacker={h} rank={i + 1} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-zinc-500 border border-[#222] rounded-xl bg-[#111]">
      {message}
    </div>
  );
}
