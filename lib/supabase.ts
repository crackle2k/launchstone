import { createClient } from "@supabase/supabase-js";

export type Hackathon = {
  id: string;
  name: string;
  slug: string;
  devpost_url: string;
  start_date: string | null;
  end_date: string | null;
  participant_count: number;
  prize_pool: number;
  prestige_score: number;
  banner_url: string | null;
  created_at: string;
};

export type Hacker = {
  id: string;
  devpost_username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  pr_score: number;
  global_rank: number | null;
  last_scraped_at: string | null;
  created_at: string;
};

export type Submission = {
  id: string;
  hacker_id: string;
  hackathon_id: string;
  project_name: string;
  project_url: string | null;
  placement: number | null;
  won: boolean;
  prize_won: string | null;
  team_members: string[];
  created_at: string;
};

// Lazily initialized so it's safe for SSR/build
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

// Client-side singleton — safe to use in "use client" components
export const supabase =
  typeof window !== "undefined"
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : (null as any);

export function getPrScoreColor(score: number, maxScore = 1000): string {
  const pct = Math.min(score / maxScore, 1);
  if (pct >= 0.99) return "text-yellow-400";
  if (pct >= 0.7) return "text-purple-400";
  if (pct >= 0.4) return "text-blue-400";
  return "text-green-400";
}

export function getPrScoreGradient(score: number, maxScore = 1000): string {
  const pct = Math.min(score / maxScore, 1);
  if (pct >= 0.99) return "from-yellow-400 to-orange-400";
  if (pct >= 0.7) return "from-purple-400 to-blue-500";
  if (pct >= 0.4) return "from-blue-400 to-cyan-400";
  return "from-green-400 to-emerald-400";
}

export function formatPrize(amount: number): string {
  if (amount === 0) return "No prize";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

export function placementLabel(placement: number | null): string {
  if (!placement) return "Participant";
  if (placement === 1) return "1st Place";
  if (placement === 2) return "2nd Place";
  if (placement === 3) return "3rd Place";
  if (placement <= 10) return "Top 10";
  return `Placed #${placement}`;
}
