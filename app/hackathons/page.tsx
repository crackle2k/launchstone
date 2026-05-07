"use client";

import { useState, useMemo } from "react";
import { useAllHackathons } from "@/hooks/useData";
import { HackathonCard } from "@/components/HackathonCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Filter = "all" | "upcoming" | "past";
type Sort = "date" | "participants" | "prize";

export default function HackathonsPage() {
  const { hackathons, loading } = useAllHackathons();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("date");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const now = new Date();
    return hackathons
      .filter((h) => {
        if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filter === "upcoming") return h.start_date && new Date(h.start_date) > now;
        if (filter === "past") return !h.end_date || new Date(h.end_date) < now;
        return true;
      })
      .sort((a, b) => {
        if (sort === "participants") return b.participant_count - a.participant_count;
        if (sort === "prize") return b.prize_pool - a.prize_pool;
        const da = a.end_date ? new Date(a.end_date).getTime() : 0;
        const db = b.end_date ? new Date(b.end_date).getTime() : 0;
        return db - da;
      });
  }, [hackathons, filter, sort, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Hackathons</h1>
        <p className="text-zinc-400">Browse and filter all tracked hackathons</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search hackathons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#111] border-[#333] text-white placeholder:text-zinc-500 max-w-xs"
        />
        <div className="flex gap-2">
          {(["all", "upcoming", "past"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-blue-500 hover:bg-blue-600" : "border-[#333] text-zinc-400 hover:text-white bg-transparent"}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <span className="text-sm text-zinc-500 self-center">Sort:</span>
          {(["date", "participants", "prize"] as Sort[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={sort === s ? "default" : "outline"}
              onClick={() => setSort(s)}
              className={sort === s ? "bg-purple-600 hover:bg-purple-700" : "border-[#333] text-zinc-400 hover:text-white bg-transparent"}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-48 bg-[#111] rounded-xl border border-[#222] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 border border-[#222] rounded-xl bg-[#111]">
          No hackathons found.
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500">{filtered.length} hackathon{filtered.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((h) => <HackathonCard key={h.id} hackathon={h} />)}
          </div>
        </>
      )}
    </div>
  );
}
