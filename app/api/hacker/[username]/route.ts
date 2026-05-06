import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { username } = await params;

  const { data: hacker, error } = await supabase
    .from("hackers")
    .select("*")
    .eq("devpost_username", username)
    .single();

  if (error || !hacker) {
    return NextResponse.json({ error: "Hacker not found" }, { status: 404 });
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*, hackathon:hackathons(*)")
    .eq("hacker_id", hacker.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ hacker, submissions: submissions || [] });
}
