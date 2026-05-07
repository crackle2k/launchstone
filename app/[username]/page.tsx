"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useHacker, useHackerSubmissions } from "@/hooks/useData";
import { getPrScoreGradient, getPrScoreColor, placementLabel } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink, RefreshCw, Trophy, Hash, Calendar } from "lucide-react";

export default function HackerProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { hacker, loading, notFound } = useHacker(username);
  const { submissions, loading: subLoading } = useHackerSubmissions(hacker?.id || "");
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState(false);

  async function triggerScrape() {
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setScraped(true);
        setTimeout(() => window.location.reload(), 2000);
      }
    } finally {
      setScraping(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-32 bg-[#111] rounded-xl border border-[#222]" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-[#111] rounded-xl border border-[#222]" />)}
        </div>
      </div>
    );
  }

  if (notFound || !hacker) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold">Hacker not found</h1>
        <p className="text-zinc-400">
          <span className="text-white font-mono">@{username}</span> hasn&apos;t been tracked yet.
        </p>
        <Button
          onClick={triggerScrape}
          disabled={scraping || scraped}
          className="bg-blue-500 hover:bg-blue-600"
        >
          {scraping ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Scraping Devpost...</>
          ) : scraped ? (
            "Scraped! Reloading..."
          ) : (
            "Search Devpost for this user"
          )}
        </Button>
        <p className="text-xs text-zinc-600">This will scrape their Devpost profile and add them to the tracker.</p>
      </div>
    );
  }

  const gradient = getPrScoreGradient(hacker.pr_score);
  const prColor = getPrScoreColor(hacker.pr_score);
  const wins = submissions.filter((s) => s.won || s.placement === 1).length;
  const top3 = submissions.filter((s) => s.placement && s.placement <= 3).length;
  const initials = (hacker.display_name || hacker.devpost_username).slice(0, 2).toUpperCase();

  const statCards = [
    {
      label: "PR Score",
      value: hacker.pr_score.toFixed(1),
      sub: hacker.global_rank ? `Rank #${hacker.global_rank} globally` : "Unranked",
      gradient: true,
    },
    { label: "Hackathons", value: submissions.length, sub: "Entered", gradient: false },
    { label: "Wins", value: wins, sub: "1st place", gradient: false },
    { label: "Top 3", value: top3, sub: "Finishes", gradient: false },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Profile header */}
      <div className="flex items-start gap-6 bg-[#111] border border-[#222] rounded-xl p-6">
        {hacker.avatar_url ? (
          <img src={hacker.avatar_url} alt={hacker.display_name || hacker.devpost_username}
            className="w-20 h-20 rounded-full object-cover shrink-0 ring-2 ring-blue-500/30" />
        ) : (
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-2xl shrink-0`}>
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h1 className="text-2xl font-bold">{hacker.display_name || hacker.devpost_username}</h1>
            <p className="text-zinc-400 text-sm">@{hacker.devpost_username}</p>
          </div>
          {hacker.bio && <p className="text-zinc-300 text-sm leading-relaxed">{hacker.bio}</p>}
          <div className="flex flex-wrap gap-3 text-sm text-zinc-500">
            {hacker.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{hacker.location}</span>
            )}
            <a href={`https://devpost.com/${hacker.devpost_username}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
              <ExternalLink className="w-3 h-3" /> Devpost
            </a>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-black ${s.gradient ? `bg-gradient-to-r ${gradient} bg-clip-text text-transparent` : "text-white"}`}>
              {s.value}
            </p>
            <p className="text-xs text-zinc-600">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Hackathon history */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Hackathon History</h2>
        {subLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#111] rounded-xl border border-[#222] animate-pulse" />)}
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 border border-[#222] rounded-xl bg-[#111]">
            No submissions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 border-b border-[#222]">
                  <th className="text-left py-3 pr-4 font-medium">Hackathon</th>
                  <th className="text-left py-3 pr-4 font-medium">Project</th>
                  <th className="text-left py-3 pr-4 font-medium">Placement</th>
                  <th className="text-right py-3 font-medium">PR Earned</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const pts = sub.placement === 1 ? 100 : sub.placement && sub.placement <= 3 ? 50 : sub.placement && sub.placement <= 10 ? 20 : 5;
                  const pr = (pts * (sub.hackathon?.prestige_score || 1)).toFixed(1);
                  return (
                    <tr key={sub.id} className="border-b border-[#1a1a1a] hover:bg-[#111]">
                      <td className="py-3 pr-4">
                        <Link href={`/hackathons/${sub.hackathon?.slug}`} className="text-blue-400 hover:text-blue-300 font-medium">
                          {sub.hackathon?.name || "Unknown"}
                        </Link>
                        {sub.hackathon?.end_date && (
                          <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(sub.hackathon.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {sub.project_url ? (
                          <a href={sub.project_url} target="_blank" rel="noopener noreferrer"
                            className="text-white hover:text-blue-300 flex items-center gap-1">
                            {sub.project_name} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : sub.project_name}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={`text-xs ${sub.won ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : sub.placement && sub.placement <= 3 ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                          {placementLabel(sub.placement)}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-green-400">+{pr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
