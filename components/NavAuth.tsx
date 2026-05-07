"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";

export function NavAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.user_name ?? user.email) as string;

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="text-sm text-zinc-400 hidden sm:block">{name}</span>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={28}
          height={28}
          className="rounded-full border border-[#333]"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs text-blue-400 font-medium">
          {name[0]?.toUpperCase()}
        </div>
      )}
      <button
        onClick={signOut}
        className="text-xs text-zinc-500 hover:text-white transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
