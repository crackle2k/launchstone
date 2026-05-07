"""
Devpost scraper for Hacker Tracker.
Uses Playwright to scrape hackathon and hacker profile data from Devpost.
"""

import asyncio
import logging
import math
import os
import re
import time
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from playwright.async_api import async_playwright, Page, TimeoutError as PlaywrightTimeout
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

REQUEST_DELAY = 1.0  # seconds between requests


def calculate_prestige_score(participant_count: int, prize_pool: int) -> float:
    if participant_count <= 0:
        return 0.0
    return math.log10(participant_count) * (1 + prize_pool / 100_000)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text


async def safe_text(page: Page, selector: str, default: str = "") -> str:
    try:
        el = await page.query_selector(selector)
        if el:
            return (await el.inner_text()).strip()
    except Exception:
        pass
    return default


async def safe_attr(page: Page, selector: str, attr: str, default: str = "") -> str:
    try:
        el = await page.query_selector(selector)
        if el:
            val = await el.get_attribute(attr)
            return val.strip() if val else default
    except Exception:
        pass
    return default


async def scrape_hackathon(devpost_url: str, page: Page) -> Optional[str]:
    """Scrape a Devpost hackathon page and upsert data. Returns hackathon id."""
    log.info(f"Scraping hackathon: {devpost_url}")
    await page.goto(devpost_url, wait_until="domcontentloaded")
    await asyncio.sleep(REQUEST_DELAY)

    name = await safe_text(page, "h1")
    if not name:
        name = await safe_text(page, ".hackathon-header h1, #title")

    banner_url = await safe_attr(page, ".hackathon-logo img, .hero-image img, header img", "src")

    # Dates
    start_date = None
    end_date = None
    try:
        date_text = await safe_text(page, ".submission-period, .dates, time")
        # Try to parse from meta tags
        start_meta = await safe_attr(page, 'meta[property="hackathon:start_date"]', "content")
        end_meta = await safe_attr(page, 'meta[property="hackathon:end_date"]', "content")
        if start_meta:
            start_date = start_meta[:10]
        if end_meta:
            end_date = end_meta[:10]
    except Exception:
        pass

    # Participant count
    participant_count = 0
    try:
        count_texts = await page.query_selector_all(".stat-count, .participants-count")
        for el in count_texts:
            text = await el.inner_text()
            text = text.replace(",", "").strip()
            if text.isdigit():
                participant_count = int(text)
                break
        if not participant_count:
            # Try finding it via text patterns on the page
            content = await page.content()
            matches = re.findall(r'(\d[\d,]*)\s*(?:participants|hackers|submissions)', content, re.IGNORECASE)
            if matches:
                participant_count = int(matches[0].replace(",", ""))
    except Exception:
        pass

    # Prize pool
    prize_pool = 0
    try:
        prize_text = await safe_text(page, ".prize-amount, .total-prizes")
        if not prize_text:
            content = await page.content()
            matches = re.findall(r'\$\s*([\d,]+)', content)
            if matches:
                prize_pool = int(matches[0].replace(",", ""))
        else:
            nums = re.findall(r'[\d,]+', prize_text.replace(",", ""))
            if nums:
                prize_pool = int(nums[0])
    except Exception:
        pass

    slug = slugify(name) if name else slugify(devpost_url.split("/")[-1])
    prestige = calculate_prestige_score(participant_count, prize_pool)

    hackathon_data = {
        "name": name or "Unknown Hackathon",
        "slug": slug,
        "devpost_url": devpost_url,
        "start_date": start_date,
        "end_date": end_date,
        "participant_count": participant_count,
        "prize_pool": prize_pool,
        "prestige_score": prestige,
        "banner_url": banner_url or None,
    }

    result = supabase.table("hackathons").upsert(
        hackathon_data, on_conflict="slug"
    ).execute()

    hackathon_id = result.data[0]["id"] if result.data else None
    log.info(f"Upserted hackathon '{name}' (id={hackathon_id})")

    if hackathon_id:
        await scrape_submissions(devpost_url, hackathon_id, page)

    return hackathon_id


async def scrape_submissions(devpost_url: str, hackathon_id: str, page: Page):
    """Scrape all project submissions for a hackathon."""
    projects_url = devpost_url.rstrip("/") + "/project-gallery"
    log.info(f"Scraping submissions from: {projects_url}")

    all_usernames = set()
    current_page = 1

    while True:
        url = f"{projects_url}?page={current_page}"
        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(REQUEST_DELAY)

        project_links = await page.query_selector_all("a.link-to-software")
        if not project_links:
            project_links = await page.query_selector_all(".software-entry a[href*='/software/']")

        if not project_links:
            log.info(f"No more projects on page {current_page}")
            break

        for link in project_links:
            try:
                href = await link.get_attribute("href")
                if href:
                    proj_data = await scrape_project_page(href, hackathon_id, page)
                    if proj_data:
                        all_usernames.update(proj_data.get("team_members", []))
                    await asyncio.sleep(REQUEST_DELAY)
            except Exception as e:
                log.error(f"Error scraping project: {e}")

        current_page += 1
        # Safety limit
        if current_page > 50:
            break

    # Scrape winner placements
    await scrape_winners(devpost_url, hackathon_id, page)

    return all_usernames


async def scrape_project_page(project_url: str, hackathon_id: str, page: Page) -> Optional[dict]:
    """Scrape an individual project page."""
    if not project_url.startswith("http"):
        project_url = "https://devpost.com" + project_url

    log.info(f"Scraping project: {project_url}")
    try:
        await page.goto(project_url, wait_until="domcontentloaded")
        await asyncio.sleep(REQUEST_DELAY)
    except PlaywrightTimeout:
        log.warning(f"Timeout scraping project: {project_url}")
        return None

    project_name = await safe_text(page, "#app-title, h1")

    # Get team members (devpost usernames)
    team_members = []
    try:
        member_links = await page.query_selector_all(".members a[href*='devpost.com/']")
        for link in member_links:
            href = await link.get_attribute("href")
            if href:
                username = href.rstrip("/").split("/")[-1]
                if username and username not in ("", "software"):
                    team_members.append(username)
    except Exception:
        pass

    if not team_members:
        try:
            member_links = await page.query_selector_all("a[href*='devpost.com/'][class*='member']")
            for link in member_links:
                href = await link.get_attribute("href")
                if href:
                    username = href.rstrip("/").split("/")[-1]
                    if username:
                        team_members.append(username)
        except Exception:
            pass

    if not project_name:
        return None

    # Upsert each team member as a hacker and create submission
    for username in team_members:
        hacker_result = supabase.table("hackers").upsert(
            {"devpost_username": username},
            on_conflict="devpost_username"
        ).execute()

        if hacker_result.data:
            hacker_id = hacker_result.data[0]["id"]
            submission = {
                "hacker_id": hacker_id,
                "hackathon_id": hackathon_id,
                "project_name": project_name,
                "project_url": project_url,
                "team_members": team_members,
                "won": False,
            }
            supabase.table("submissions").upsert(
                submission, on_conflict="hacker_id,hackathon_id"
            ).execute()

    return {"project_name": project_name, "team_members": team_members, "project_url": project_url}


async def scrape_winners(devpost_url: str, hackathon_id: str, page: Page):
    """Try to scrape winner placements from the hackathon winners page."""
    winners_url = devpost_url.rstrip("/") + "/winners"
    log.info(f"Scraping winners from: {winners_url}")
    try:
        await page.goto(winners_url, wait_until="domcontentloaded")
        await asyncio.sleep(REQUEST_DELAY)
    except PlaywrightTimeout:
        return

    # Try to find winner entries
    try:
        winner_sections = await page.query_selector_all(".winner, .prize-winner, [class*='winner']")
        for i, section in enumerate(winner_sections[:10]):
            project_link = await section.query_selector("a[href*='/software/']")
            if project_link:
                href = await project_link.get_attribute("href")
                project_name_el = await project_link.query_selector("h5, h4, .software-title")
                project_name = await project_name_el.inner_text() if project_name_el else ""

                # Update placement for this project in submissions
                placement = i + 1
                supabase.table("submissions").update({
                    "placement": placement,
                    "won": placement == 1
                }).eq("hackathon_id", hackathon_id).eq("project_name", project_name).execute()
    except Exception as e:
        log.warning(f"Could not parse winners: {e}")


async def scrape_hacker_profile(username: str, page: Page):
    """Scrape a hacker's Devpost profile."""
    url = f"https://devpost.com/{username}"
    log.info(f"Scraping hacker profile: {url}")
    try:
        await page.goto(url, wait_until="domcontentloaded")
        await asyncio.sleep(REQUEST_DELAY)
    except PlaywrightTimeout:
        log.warning(f"Timeout scraping profile: {url}")
        return

    display_name = await safe_text(page, "h1.profile-name, h1[class*='name'], h1")
    avatar_url = await safe_attr(page, ".profile-avatar img, .avatar img", "src")
    bio = await safe_text(page, ".profile-bio, .bio, [class*='bio']")
    location = await safe_text(page, ".profile-location, .location, [class*='location']")

    hacker_data = {
        "devpost_username": username,
        "display_name": display_name or username,
        "avatar_url": avatar_url or None,
        "bio": bio or None,
        "location": location or None,
        "last_scraped_at": datetime.utcnow().isoformat(),
    }

    supabase.table("hackers").upsert(
        hacker_data, on_conflict="devpost_username"
    ).execute()

    log.info(f"Upserted hacker: {username}")
    recalculate_pr_scores()


def recalculate_pr_scores():
    """Recalculate PR scores and global ranks for all hackers."""
    log.info("Recalculating PR scores and global ranks...")
    try:
        supabase.rpc("recalculate_all_ranks").execute()
        log.info("PR scores recalculated")
    except Exception as e:
        log.error(f"Error recalculating PR scores: {e}")


async def run(devpost_url: str):
    """Main entry point: scrape a hackathon, then all hacker profiles found."""
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        try:
            hackathon_id = await scrape_hackathon(devpost_url, page)
            if not hackathon_id:
                log.error("Failed to scrape hackathon")
                return

            # Get all unique usernames from submissions
            result = supabase.table("submissions")\
                .select("team_members")\
                .eq("hackathon_id", hackathon_id)\
                .execute()

            usernames = set()
            for row in result.data:
                for u in (row.get("team_members") or []):
                    usernames.add(u)

            log.info(f"Found {len(usernames)} unique hackers, scraping profiles...")
            for username in usernames:
                await scrape_hacker_profile(username, page)
                await asyncio.sleep(REQUEST_DELAY)

            recalculate_pr_scores()

        finally:
            await browser.close()


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python devpost_scraper.py <devpost_hackathon_url>")
        sys.exit(1)
    asyncio.run(run(sys.argv[1]))
