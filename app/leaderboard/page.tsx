"use client";

import { useState } from "react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useData";
import { getPrScoreGradient } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

export default function LeaderboardPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { hackers, total, loading } = useLeaderboard(page, PAGE_SIZE, search);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-zinc-400">Global rankings by PR Score</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-xs">
        <Input
          placeholder="Search username..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="bg-[#111] border-[#333] text-white placeholder:text-zinc-500"
        />
        <Button type="submit" className="bg-blue-500 hover:bg-blue-600">Search</Button>
      </form>

      {loading ? (
        <div className="space-y-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-14 bg-[#111] rounded-lg border border-[#222] animate-pulse" />
          ))}
        </div>
      ) : hackers.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 border border-[#222] rounded-xl bg-[#111]">
          No hackers found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 border-b border-[#222]">
                  <th className="text-left py-3 pr-4 font-medium w-12">Rank</th>
                  <th className="text-left py-3 pr-4 font-medium">Hacker</th>
                  <th className="text-right py-3 pr-4 font-medium">PR Score</th>
                  <th className="text-right py-3 font-medium hidden sm:table-cell">Hackathons</th>
                </tr>
              </thead>
              <tbody>
                {hackers.map((hacker, i) => {
                  const rank = hacker.global_rank || (page - 1) * PAGE_SIZE + i + 1;
                  const gradient = getPrScoreGradient(hacker.pr_score);
                  const initials = (hacker.display_name || hacker.devpost_username).slice(0, 2).toUpperCase();
                  return (
                    <tr key={hacker.id} className="border-b border-[#1a1a1a] hover:bg-[#111] transition-colors">
                      <td className="py-3 pr-4">
                        <span className="text-zinc-500 font-mono">
                          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Link href={`/${hacker.devpost_username}`} className="flex items-center gap-3 group">
                          {hacker.avatar_url ? (
                            <img src={hacker.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {initials}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white group-hover:text-blue-300 transition-colors">
                              {hacker.display_name || hacker.devpost_username}
                            </p>
                            <p className="text-xs text-zinc-500">@{hacker.devpost_username}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span className={`font-black text-lg bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                          {hacker.pr_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 text-right text-zinc-400 hidden sm:table-cell">—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-[#333] text-zinc-400 bg-transparent hover:bg-[#222]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-zinc-400 self-center px-2">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border-[#333] text-zinc-400 bg-transparent hover:bg-[#222]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
