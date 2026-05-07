"use client";

import { createClient } from "@/utils/supabase/client";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  async function signInWithGitHub() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-blue-400">Hacker</span>
            <span className="text-white">Tracker</span>
          </h1>
          <p className="text-zinc-400 text-sm">
            Sign in to track hackathon stats and leaderboards.
          </p>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">Welcome</h2>
            <p className="text-zinc-500 text-sm">Sign in to continue</p>
          </div>

          <Button
            onClick={signInWithGitHub}
            className="w-full h-11 bg-white text-black hover:bg-zinc-100 font-medium flex items-center gap-3"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
