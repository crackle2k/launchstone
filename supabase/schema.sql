-- Hacker Tracker Database Schema

-- Hackathons table
CREATE TABLE IF NOT EXISTS hackathons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  devpost_url text NOT NULL,
  start_date date,
  end_date date,
  participant_count int DEFAULT 0,
  prize_pool int DEFAULT 0,
  prestige_score float DEFAULT 0,
  banner_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Hackers table
CREATE TABLE IF NOT EXISTS hackers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devpost_username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  location text,
  pr_score float DEFAULT 0,
  global_rank int,
  last_scraped_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hacker_id uuid NOT NULL REFERENCES hackers(id) ON DELETE CASCADE,
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  project_url text,
  placement int,
  won boolean DEFAULT false,
  prize_won text,
  team_members text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(hacker_id, hackathon_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hackathons_slug ON hackathons(slug);
CREATE INDEX IF NOT EXISTS idx_hackathons_end_date ON hackathons(end_date DESC);
CREATE INDEX IF NOT EXISTS idx_hackers_username ON hackers(devpost_username);
CREATE INDEX IF NOT EXISTS idx_hackers_pr_score ON hackers(pr_score DESC);
CREATE INDEX IF NOT EXISTS idx_hackers_global_rank ON hackers(global_rank ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_submissions_hacker_id ON submissions(hacker_id);
CREATE INDEX IF NOT EXISTS idx_submissions_hackathon_id ON submissions(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_submissions_placement ON submissions(placement ASC NULLS LAST);

-- Function to calculate prestige score for a hackathon
CREATE OR REPLACE FUNCTION calculate_prestige_score(participant_count int, prize_pool int)
RETURNS float AS $$
BEGIN
  IF participant_count <= 0 THEN
    RETURN 0;
  END IF;
  RETURN log(participant_count::float) * (1 + COALESCE(prize_pool, 0)::float / 100000);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate PR score for a hacker
CREATE OR REPLACE FUNCTION calculate_pr_score(hacker_uuid uuid)
RETURNS float AS $$
DECLARE
  total_pr float := 0;
  sub_record RECORD;
  points float;
BEGIN
  FOR sub_record IN
    SELECT s.placement, s.won, h.prestige_score
    FROM submissions s
    JOIN hackathons h ON s.hackathon_id = h.id
    WHERE s.hacker_id = hacker_uuid
  LOOP
    IF sub_record.placement = 1 OR sub_record.won = true THEN
      points := 100;
    ELSIF sub_record.placement BETWEEN 2 AND 3 THEN
      points := 50;
    ELSIF sub_record.placement BETWEEN 4 AND 10 THEN
      points := 20;
    ELSE
      points := 5;
    END IF;
    total_pr := total_pr + (points * COALESCE(sub_record.prestige_score, 1));
  END LOOP;
  RETURN total_pr;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate all PR scores and global ranks
CREATE OR REPLACE FUNCTION recalculate_all_ranks()
RETURNS void AS $$
BEGIN
  -- Update PR scores
  UPDATE hackers
  SET pr_score = calculate_pr_score(id);

  -- Update global ranks based on PR score
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY pr_score DESC) as rank
    FROM hackers
    WHERE pr_score > 0
  )
  UPDATE hackers
  SET global_rank = ranked.rank
  FROM ranked
  WHERE hackers.id = ranked.id;

  -- Set null rank for hackers with 0 PR
  UPDATE hackers SET global_rank = NULL WHERE pr_score = 0;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read hackathons" ON hackathons FOR SELECT USING (true);
CREATE POLICY "Public read hackers" ON hackers FOR SELECT USING (true);
CREATE POLICY "Public read submissions" ON submissions FOR SELECT USING (true);

-- Service role write policies (for scraper)
CREATE POLICY "Service role write hackathons" ON hackathons FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write hackers" ON hackers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write submissions" ON submissions FOR ALL USING (auth.role() = 'service_role');
