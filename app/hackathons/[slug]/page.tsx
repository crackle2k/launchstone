"use client";

import { use } from "react";
import Link from "next/link";
import { useHackathon, useHackathonSubmissions } from "@/hooks/useData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatPrize, placementLabel, getPrScoreGradient } from "@/lib/supabase";
import { Users, Trophy, Calendar, ExternalLink } from "lucide-react";

export default function HackathonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { hackathon, loading } = useHackathon(slug);
  const { submissions, loading: subLoading } = useHackathonSubmissions(hackathon?.id || "");

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6 animate-pulse">
        <div className="h-48 bg-[#111] rounded-xl border border-[#222]" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#111] rounded-xl border border-[#222]" />)}
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="text-6xl">🏆</div>
        <h1 className="text-2xl font-bold">Hackathon not found</h1>
        <p className="text-zinc-400">This hackathon hasn&apos;t been tracked yet.</p>
        <Link href="/hackathons" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back to hackathons
        </Link>
      </div>
    );
  }

  const winners = submissions.filter((s) => s.won || (s.placement && s.placement <= 10))
    .sort((a, b) => (a.placement || 999) - (b.placement || 999));
  const allProjects = submissions;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Hero banner */}
      <div className="relative rounded-xl overflow-hidden border border-[#222]">
        {hackathon.banner_url ? (
          <div className="relative">
            <img src={hackathon.banner_url} alt={hackathon.name} className="w-full h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
          </div>
        ) : (
          <div className="h-56 bg-gradient-to-br from-blue-900/40 to-purple-900/40" />
        )}
        <div className="absolute bottom-0 left-0 p-6 space-y-2">
          <h1 className="text-3xl font-black text-white drop-shadow">{hackathon.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            {hackathon.participant_count > 0 && (
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Users className="w-4 h-4" /> {hackathon.participant_count.toLocaleString()} participants
              </span>
            )}
            {hackathon.prize_pool > 0 && (
              <span className="flex items-center gap-1.5 text-yellow-400">
                <Trophy className="w-4 h-4" /> {formatPrize(hackathon.prize_pool)}
              </span>
            )}
            {hackathon.start_date && hackathon.end_date && (
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Calendar className="w-4 h-4" />
                {new Date(hackathon.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" – "}
                {new Date(hackathon.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
        {hackathon.devpost_url && (
          <a href={hackathon.devpost_url} target="_blank" rel="noopener noreferrer"
            className="absolute top-4 right-4 flex items-center gap-1.5 text-xs bg-black/50 hover:bg-black/80 px-3 py-1.5 rounded-full text-zinc-300 transition-colors">
            <ExternalLink className="w-3 h-3" /> Devpost
          </a>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Prestige Score" value={hackathon.prestige_score.toFixed(2)} />
        <StatCard label="Submissions" value={allProjects.length} />
        <StatCard label="Winners" value={winners.length} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="winners">
        <TabsList className="bg-[#111] border border-[#222]">
          <TabsTrigger value="winners" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Winners</TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">All Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="winners" className="mt-4">
          {subLoading ? (
            <LoadingSkeleton />
          ) : winners.length === 0 ? (
            <Empty message="No winners recorded yet." />
          ) : (
            <div className="space-y-2">
              {winners.map((sub) => (
                <SubmissionRow key={sub.id} sub={sub} showPlacement />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-4">
          {subLoading ? (
            <LoadingSkeleton />
          ) : allProjects.length === 0 ? (
            <Empty message="No projects scraped yet." />
          ) : (
            <div className="space-y-2">
              {allProjects.map((sub) => (
                <SubmissionRow key={sub.id} sub={sub} showPlacement={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black text-white mt-1">{value}</p>
    </div>
  );
}

function SubmissionRow({ sub, showPlacement }: { sub: any; showPlacement: boolean }) {
  const hacker = sub.hacker;
  const gradient = getPrScoreGradient(hacker?.pr_score || 0);
  const initials = ((hacker?.display_name || hacker?.devpost_username) || "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] rounded-xl">
      {showPlacement && (
        <div className="text-sm font-mono text-zinc-500 w-10 text-center shrink-0">
          {sub.placement === 1 ? "🥇" : sub.placement === 2 ? "🥈" : sub.placement === 3 ? "🥉" : `#${sub.placement || "—"}`}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">
          {sub.project_url ? (
            <a href={sub.project_url} target="_blank" rel="noopener noreferrer"
              className="hover:text-blue-300 flex items-center gap-1">
              {sub.project_name} <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ) : sub.project_name}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {(sub.team_members || []).map((u: string) => (
            <Link key={u} href={`/${u}`} className="text-xs text-blue-400 hover:text-blue-300">
              @{u}
            </Link>
          ))}
        </div>
      </div>
      {showPlacement && sub.placement && (
        <Badge className="shrink-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          {placementLabel(sub.placement)}
        </Badge>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-[#111] rounded-xl border border-[#222] animate-pulse" />)}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-zinc-500 border border-[#222] rounded-xl bg-[#111]">{message}</div>
  );
}
