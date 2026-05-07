"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Hackathon, Hacker, Submission } from "@/lib/supabase";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function useRecentHackathons(limit = 6) {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClient()
      .from("hackathons")
      .select("*")
      .order("end_date", { ascending: false })
      .limit(limit)
      .then((res: { data: unknown }) => {
        setHackathons((res.data as Hackathon[]) || []);
        setLoading(false);
      });
  }, [limit]);

  return { hackathons, loading };
}

export function useTopHackers(limit = 5) {
  const [hackers, setHackers] = useState<Hacker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClient()
      .from("hackers")
      .select("*")
      .order("pr_score", { ascending: false })
      .limit(limit)
      .then((res: { data: unknown }) => {
        setHackers((res.data as Hacker[]) || []);
        setLoading(false);
      });
  }, [limit]);

  return { hackers, loading };
}

export function useHacker(username: string) {
  const [hacker, setHacker] = useState<Hacker | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getClient()
      .from("hackers")
      .select("*")
      .eq("devpost_username", username)
      .single()
      .then((res: { data: unknown; error: unknown }) => {
        if (res.error || !res.data) setNotFound(true);
        else setHacker(res.data as Hacker);
        setLoading(false);
      });
  }, [username]);

  return { hacker, loading, notFound };
}

export function useHackerSubmissions(hackerId: string) {
  const [submissions, setSubmissions] = useState<(Submission & { hackathon: Hackathon })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hackerId) return;
    getClient()
      .from("submissions")
      .select("*, hackathon:hackathons(*)")
      .eq("hacker_id", hackerId)
      .order("created_at", { ascending: false })
      .then((res: { data: unknown }) => {
        setSubmissions((res.data as (Submission & { hackathon: Hackathon })[]) || []);
        setLoading(false);
      });
  }, [hackerId]);

  return { submissions, loading };
}

export function useAllHackathons() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClient()
      .from("hackathons")
      .select("*")
      .order("end_date", { ascending: false })
      .then((res: { data: unknown }) => {
        setHackathons((res.data as Hackathon[]) || []);
        setLoading(false);
      });
  }, []);

  return { hackathons, loading };
}

export function useHackathon(slug: string) {
  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClient()
      .from("hackathons")
      .select("*")
      .eq("slug", slug)
      .single()
      .then((res: { data: unknown }) => {
        setHackathon((res.data as Hackathon) || null);
        setLoading(false);
      });
  }, [slug]);

  return { hackathon, loading };
}

export function useHackathonSubmissions(hackathonId: string) {
  const [submissions, setSubmissions] = useState<(Submission & { hacker: Hacker })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hackathonId) return;
    getClient()
      .from("submissions")
      .select("*, hacker:hackers(*)")
      .eq("hackathon_id", hackathonId)
      .order("placement", { ascending: true, nullsFirst: false })
      .then((res: { data: unknown }) => {
        setSubmissions((res.data as (Submission & { hacker: Hacker })[]) || []);
        setLoading(false);
      });
  }, [hackathonId]);

  return { submissions, loading };
}

export function useLeaderboard(page = 1, pageSize = 50, search = "") {
  const [hackers, setHackers] = useState<Hacker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = getClient()
      .from("hackers")
      .select("*", { count: "exact" })
      .order("pr_score", { ascending: false })
      .range(from, to);

    if (search) {
      query = query.ilike("devpost_username", `%${search}%`);
    }

    query.then((res: { data: unknown; count: number | null }) => {
      setHackers((res.data as Hacker[]) || []);
      setTotal(res.count || 0);
      setLoading(false);
    });
  }, [page, pageSize, search]);

  return { hackers, total, loading };
}
