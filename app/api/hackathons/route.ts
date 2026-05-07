import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const sort = searchParams.get("sort") || "end_date";

  const validSorts: Record<string, string> = {
    end_date: "end_date",
    participants: "participant_count",
    prize: "prize_pool",
  };

  const column = validSorts[sort] || "end_date";

  const { data, error, count } = await supabase
    .from("hackathons")
    .select("*", { count: "exact" })
    .order(column, { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ hackathons: data || [], total: count || 0 });
}
