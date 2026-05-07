# Hacker Tracker

Tracker.gg for hackathon competitors — search any Devpost username, see their PR score, global rank, hackathon history, wins, and more.

## Tech Stack

- **Frontend + API**: Next.js 14 (App Router, TypeScript)
- **Database + Auth**: Supabase (Postgres + RLS)
- **Styling**: Tailwind CSS + shadcn/ui
- **Scraper**: Python + Playwright
- **Deployment**: Vercel (frontend) + Supabase (DB)

---

## Setup

### 1. Clone & Install

```bash
git clone <repo>
cd hacker-tracker
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your project URL and keys from **Settings → API**

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PYTHON_SCRAPER_SECRET=your-secret-string
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## Python Scraper

### Setup

```bash
cd scraper
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

Create `scraper/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Usage

```bash
python devpost_scraper.py https://your-hackathon.devpost.com
```

This will:
1. Scrape the hackathon page (name, dates, participants, prizes)
2. Scrape all submitted projects and team members
3. Scrape each team member's Devpost profile
4. Recalculate PR scores and global ranks

---

## PR Score Formula

```
PR = sum(points x prestige_score) for each submission

Points:
  Win (1st):       100 pts
  Top 3 (2-3):      50 pts
  Top 10 (4-10):    20 pts
  Participation:     5 pts

Prestige Score = log10(participants) x (1 + prize_pool / 100000)
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with search, recent hackathons, top hackers |
| `/[username]` | Hacker profile — PR score, rank, history |
| `/hackathons` | All hackathons with filters and sorting |
| `/hackathons/[slug]` | Hackathon detail — winners and projects |
| `/leaderboard` | Global PR leaderboard, paginated |

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/hackathons` | GET | List all hackathons |
| `/api/hacker/[username]` | GET | Get hacker + submissions |
| `/api/scrape` | POST | Create stub hacker record |

---

## Deployment

Deploy frontend to Vercel and add environment variables in the Vercel dashboard.
