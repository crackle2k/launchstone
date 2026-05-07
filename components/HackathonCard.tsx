import Link from "next/link";
import { Hackathon, formatPrize } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy } from "lucide-react";

export function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
  const now = new Date();
  const end = hackathon.end_date ? new Date(hackathon.end_date) : null;
  const start = hackathon.start_date ? new Date(hackathon.start_date) : null;

  let status: "upcoming" | "active" | "past" = "past";
  if (end && end > now && start && start > now) status = "upcoming";
  else if (start && start <= now && end && end >= now) status = "active";

  const statusColors = {
    upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    past: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  return (
    <Link href={`/hackathons/${hackathon.slug}`}>
      <div className="group relative bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#333] transition-all hover:shadow-lg hover:shadow-blue-500/5">
        {hackathon.banner_url ? (
          <div className="h-32 overflow-hidden">
            <img
              src={hackathon.banner_url}
              alt={hackathon.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-zinc-700" />
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors">
              {hackathon.name}
            </h3>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${statusColors[status]}`}>
              {status}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            {hackathon.participant_count > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {hackathon.participant_count.toLocaleString()}
              </span>
            )}
            {hackathon.prize_pool > 0 && (
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <span className="text-yellow-500">{formatPrize(hackathon.prize_pool)}</span>
              </span>
            )}
            {hackathon.end_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(hackathon.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
