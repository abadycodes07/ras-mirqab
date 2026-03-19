import asyncio
import json
import sys
import os
from twscrape import API, AccountsPool, gather
import httpx
from bs4 import BeautifulSoup
from datetime import datetime

# V61.0: Universal 4-Layer "Stealth + Professional" Scraper
# Targeted List: https://x.com/i/lists/2031445708524421549
TWITTER_LIST_ID = int(os.getenv("TWITTER_LIST_ID", "2031445708524421549"))
SOCIALDATA_API_KEY = os.getenv("SOCIALDATA_API_KEY")

# Expanded Nitter instances for fallback (prioritizing RSS-enabled ones)
NITTER_INSTANCES = [
    "https://nitter.perennialte.ch",
    "https://nitter.cz",
    "https://nitter.it",
    "https://nitter.privacydev.net",
    "https://nitter.unixfox.eu",
    "https://nitter.moomoo.me",
    "https://nitter.d420.me",
    "https://nitter.rawbit.ninja",
    "https://nitter.tiekoetter.com",
    "https://nitter.net"
]

async def layer1_twscrape():
    """Layer 1: GraphQL API bypass via twscrape (Free & Fast)"""
    try:
        pool = AccountsPool() 
        api = API(pool)
        
        # Auto-provision accounts from environment variable if needed
        # Format: username:password:email:email_password|user2:pass2...
        accounts_raw = os.getenv("TWITTER_ACCOUNTS")
        if accounts_raw:
            # Check if we have active accounts (Fixed for twscrape v0.6+)
            active_accounts = await pool.get_all()
            if not active_accounts:
                print(f"DEBUG: Found {len(accounts_raw.split('|'))} accounts in TWITTER_ACCOUNTS. Provisioning...", file=sys.stderr)
                for acc_str in accounts_raw.split('|'):
                    parts = acc_str.split(':')
                    if len(parts) >= 4:
                        user = parts[0].strip().replace("@", "")
                        pwd  = parts[1].strip()
                        email = parts[2].strip()
                        epwd = parts[3].strip()
                        print(f"DEBUG: Adding account {user}...", file=sys.stderr)
                        await pool.add_account(user, pwd, email, epwd)
                print("DEBUG: Executing login_all()...", file=sys.stderr)
                await pool.login_all()
            else:
                print(f"DEBUG: Using {len(active_accounts)} existing accounts from db.", file=sys.stderr)

        # Fetch the list timeline
        print(f"DEBUG: Fetching List {TWITTER_LIST_ID}...", file=sys.stderr)
        tweets = await gather(api.list_timeline(list_id=TWITTER_LIST_ID, limit=20))
        print(f"DEBUG: Layer 1 found {len(tweets)} raw tweets.", file=sys.stderr)
        
        results = []
        for tw in tweets:
            results.append({
                "headline_text": tw.rawContent.replace("\n", " ").strip(),
                "media_url": tw.media.photos[0].url if tw.media.photos else (tw.media.videos[0].thumbnailUrl if tw.media.videos else None),
                "channel_name": tw.user.displayname,
                "source_platform": "twscrape",
                "timestamp": tw.date.isoformat()
            })
        return results
    except Exception as e:
        print(f"DEBUG: Layer 1 (twscrape) exception: {e}", file=sys.stderr)
        return None

def layer2_nitter():
    """Layer 2: Nitter RSS Scraper (The most robust free fallback)"""
    print("DEBUG: Initiating Layer 2 (Nitter RSS Fallback)...", file=sys.stderr)
    
    for instance in NITTER_INSTANCES:
        try:
            # We use the /rss endpoint which is more stable than HTML
            url = f"{instance}/i/lists/{TWITTER_LIST_ID}/rss"
            print(f"DEBUG: Trying Nitter RSS: {url}...", file=sys.stderr)
            
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
            response = httpx.get(url, headers=headers, timeout=15, follow_redirects=True)
            
            if response.status_code != 200:
                print(f"DEBUG: RSS Instance {instance} returned status {response.status_code}", file=sys.stderr)
                continue
            
            if "RSS feed is disabled" in response.text:
                print(f"DEBUG: RSS disabled on {instance}", file=sys.stderr)
                continue
                
            soup = BeautifulSoup(response.text, 'xml')
            items = soup.find_all('item')
            
            if not items:
                print(f"DEBUG: No RSS items found on {instance}", file=sys.stderr)
                continue
                
            results = []
            for item in items[:20]:
                try:
                    title = item.find('title').get_text().strip() if item.find('title') else ""
                    # Nitter titles often include the full tweet text
                    
                    creator = item.find('dc:creator')
                    user = creator.get_text().strip() if creator else "News Channel"
                    
                    # Extract media from description if present
                    media_url = None
                    desc = item.find('description')
                    if desc:
                        desc_soup = BeautifulSoup(desc.get_text(), 'html.parser')
                        img = desc_soup.find('img')
                        if img: 
                            src = img['src']
                            media_url = instance + src if src.startswith('/') else src
                    
                    pub_date = item.find('pubDate').get_text() if item.find('pubDate') else datetime.now().isoformat()
                    
                    results.append({
                        "headline_text": title,
                        "media_url": media_url,
                        "channel_name": user,
                        "source_platform": "nitter_rss",
                        "timestamp": pub_date
                    })
                except Exception:
                    continue
            
            if results:
                print(f"DEBUG: Layer 2 found {len(results)} tweets via RSS {instance}.", file=sys.stderr)
                return results
                
        except Exception as e:
            print(f"DEBUG: Error with Nitter RSS {instance}: {e}", file=sys.stderr)
            continue
            
    return []

async def layer3_playwright_nitter():
    """Layer 3: Browser-based scraping (The "Nuclear" Fallback)"""
    print("DEBUG: Initiating Layer 3 (Playwright Browser Fallback)...", file=sys.stderr)
    
    try:
        from playwright.async_api import async_playwright
    except ImportError as e:
        print(f"DEBUG: Playwright library not available: {e}", file=sys.stderr)
        return []
        
    # Instance that worked for the subagent's browser
    instance = "https://nitter.tiekoetter.com"
    url = f"{instance}/i/lists/{TWITTER_LIST_ID}"
    
    try:
        async with async_playwright() as p:
            print(f"DEBUG: Launching headless browser for {url}...", file=sys.stderr)
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            # Go to the list page
            await page.goto(url, timeout=30000, wait_until="networkidle")
            
            # Wait for tweets to appear
            await page.wait_for_selector(".timeline-item", timeout=10000)
            
            # Extract items
            items = await page.query_selector_all(".timeline-item")
            print(f"DEBUG: Playwright found {len(items)} items on page.", file=sys.stderr)
            
            results = []
            for item in items[:20]:
                try:
                    # Check if it's a real tweet (has body)
                    body_exists = await item.query_selector(".tweet-body")
                    if not body_exists: continue
                    
                    text_el = await item.query_selector(".tweet-content")
                    text = (await text_el.inner_text()).replace("\n", " ").strip() if text_el else ""
                    if not text: continue
                    
                    user_el = await item.query_selector(".fullname")
                    user = (await user_el.inner_text()).strip() if user_el else "News Channel"
                    
                    timestamp_el = await item.query_selector(".tweet-date a")
                    timestamp = await timestamp_el.get_attribute("title") if timestamp_el else datetime.now().isoformat()
                    
                    media_url = None
                    img_el = await item.query_selector(".attachments img")
                    if img_el:
                        src = await img_el.get_attribute("src")
                        media_url = instance + src if src.startswith("/") else src
                    
                    results.append({
                        "headline_text": text,
                        "media_url": media_url,
                        "channel_name": user,
                        "source_platform": "nitter_browser",
                        "timestamp": timestamp
                    })
                except Exception:
                    continue
            
            await browser.close()
            return results
            
    except Exception as e:
        print(f"DEBUG: Layer 3 (Playwright) failed: {e}", file=sys.stderr)
        return []

async def layer4_socialdata():
    """Layer 4: Professional-Grade API (SocialData.tools)"""
    if not SOCIALDATA_API_KEY:
        print("DEBUG: Layer 4 skipped (SOCIALDATA_API_KEY missing).", file=sys.stderr)
        return []
        
    print(f"DEBUG: Initiating Layer 4 (SocialData API)...", file=sys.stderr)
    url = f"https://api.socialdata.tools/twitter/list/{TWITTER_LIST_ID}/tweets"
    headers = {"Authorization": f"Bearer {SOCIALDATA_API_KEY}", "Accept": "application/json"}
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=20.0)
            if resp.status_code == 200:
                data = resp.json()
                tweets = data.get("tweets", [])
                results = []
                for t in tweets[:20]:
                    results.append({
                        "headline_text": t.get("full_text", ""),
                        "media_url": t.get("entities", {}).get("media", [{}])[0].get("media_url_https"),
                        "channel_name": t.get("user", {}).get("name", "News"),
                        "source_platform": "socialdata",
                        "timestamp": t.get("created_at")
                    })
                print(f"DEBUG: Layer 4 found {len(results)} items.", file=sys.stderr)
                return results
            else:
                print(f"DEBUG: Layer 4 (SocialData) status {resp.status_code}", file=sys.stderr)
    except Exception as e:
        print(f"DEBUG: Layer 4 (SocialData) failed: {e}", file=sys.stderr)
        
    return []

async def fetch_breaking_news():
    # Attempt Layer 1: SocialData.tools (Professional - Prioritized if Key exists)
    print("DEBUG: [V61.1] Starting 4-Layer Stealth Scraper...", file=sys.stderr)
    data = []
    
    if SOCIALDATA_API_KEY:
        print("DEBUG: Prioritizing Layer 4 (SocialData API)...", file=sys.stderr)
        data = await layer4_socialdata()
        if data: return data

    # Fallback to Layer 1: twscrape (Old Layer 1)
    print("DEBUG: Falling back to Layer 1 (X/twscrape)...", file=sys.stderr)
    data = await layer1_twscrape()
    if data: return data
    
    # Fallback to Layer 2: Nitter RSS
    print("DEBUG: Falling back to Layer 2 (Nitter RSS).", file=sys.stderr)
    data = layer2_nitter()
    if data: return data
        
    # Fallback to Layer 3: Playwright Nitter Browser
    print("DEBUG: Falling back to Layer 3 (Playwright Browser).", file=sys.stderr)
    data = await layer3_playwright_nitter()
    
    return data

if __name__ == "__main__":
    try:
        data = asyncio.run(fetch_breaking_news())
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        print(json.dumps([]))
