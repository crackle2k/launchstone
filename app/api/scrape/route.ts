import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const secret = req.headers.get("x-scraper-secret");
  const body = await req.json().catch(() => ({}));
  const { username, devpost_url } = body;

  if (devpost_url && secret !== process.env.PYTHON_SCRAPER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (username) {
    const { error } = await supabase
      .from("hackers")
      .upsert({ devpost_username: username }, { onConflict: "devpost_username" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `Hacker @${username} queued. Run the Python scraper to populate their data.`,
    });
  }

  if (devpost_url) {
    return NextResponse.json({ ok: true, message: "Use Python scraper directly for full hackathon scrapes." });
  }

  return NextResponse.json({ error: "Provide username or devpost_url" }, { status: 400 });
}
