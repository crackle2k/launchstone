"use client";

import { createClient } from "@/utils/supabase/client";
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
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            Continue with GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
