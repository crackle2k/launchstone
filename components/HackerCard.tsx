import Link from "next/link";
import { Hacker, getPrScoreGradient } from "@/lib/supabase";

export function HackerCard({ hacker, rank }: { hacker: Hacker; rank: number }) {
  const gradient = getPrScoreGradient(hacker.pr_score);
  const initials = (hacker.display_name || hacker.devpost_username).slice(0, 2).toUpperCase();

  return (
    <Link href={`/${hacker.devpost_username}`}>
      <div className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] rounded-xl hover:border-[#333] transition-all hover:shadow-md group">
        <div className="text-zinc-600 font-mono text-sm w-6 text-right shrink-0">
          {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`}
        </div>
        {hacker.avatar_url ? (
          <img
            src={hacker.avatar_url}
            alt={hacker.display_name || hacker.devpost_username}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
            {hacker.display_name || hacker.devpost_username}
          </p>
          <p className="text-xs text-zinc-500">@{hacker.devpost_username}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold text-lg bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {hacker.pr_score.toFixed(1)}
          </p>
          <p className="text-xs text-zinc-500">PR Score</p>
        </div>
      </div>
    </Link>
  );
}
