import asyncio
import json
import sys
import os
import httpx
import traceback
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import quote

# ═══════════════════════════════════════════════
# V66.6: Resilient Scraper (Verified Mirror Swarm)
# ═══════════════════════════════════════════════

TWITTER_LIST_ID = os.getenv("TWITTER_LIST_ID", "2031445708524421549")
SCRAPEDO_API_KEY = os.getenv("SCRAPEDO_API_KEY", "20a03e1d412a44c1a19277ba8feb43be000d574775d")

# V66.6: Verified working mirrors for lists
NITTER_INSTANCES = [
    "https://nitter.privacyredirect.com",
    "https://xcancel.com",
    "https://nitter.it",
    "https://nitter.moomoo.me",
    "https://nitter.poast.org"
]

def enforce_https(url):
    if not url: return None
    if url.startswith('//'): return 'https:' + url
    if url.startswith('http://'): return 'https' + url[4:]
    return url

async def fetch_from_instance(client, instance, list_id):
    """Attempt direct fetch then Scrape.do failover."""
    target_url = f"{instance}/i/lists/{list_id}/rss"
    
    # 1. Direct Fetch (Fast, 10s timeout)
    try:
        print(f"DEBUG: Trying direct fetch from {instance}...", file=sys.stderr)
        resp = await client.get(target_url, timeout=10.0, follow_redirects=True)
        if resp.status_code == 200 and len(resp.text) > 500:
            return resp.text, instance
    except: pass

    # 2. Scrape.do Failover (Reliable, 60s timeout)
    if not SCRAPEDO_API_KEY: return None
    
    print(f"DEBUG: Falling back to Scrape.do for {instance}...", file=sys.stderr)
    encoded_url = quote(target_url)
    # V66.6: Remove super=true as these mirrors are less aggressive with anti-bot
    api_url = f"https://api.scrape.do?token={SCRAPEDO_API_KEY}&url={encoded_url}"
    try:
        resp = await client.get(api_url, timeout=60.0)
        if resp.status_code == 200:
            return resp.text, instance
    except Exception as e:
        print(f"WARN: Scrape.do failed for {instance}: {str(e)}", file=sys.stderr)
    
    return None

async def fetch_via_scrapedo():
    """V66.6: Verified Swarm Scraper."""
    print(f"DEBUG: [V66.6] Starting Verified Swarm Fetch...", file=sys.stderr)
    
    async with httpx.AsyncClient() as client:
        html = None
        active_instance = None
        
        for inst in NITTER_INSTANCES:
            res = await fetch_from_instance(client, inst, TWITTER_LIST_ID)
            if res:
                html, active_instance = res
                break
        
        if not html:
            print("ERROR: All instances in swarm failed.", file=sys.stderr)
            return []

        try:
            soup = BeautifulSoup(html, 'xml')
            items = soup.find_all('item')
            results = []
            
            base = str(active_instance)
            
            for item in items[:50]:
                try:
                    title = item.find('title').get_text().strip() if item.find('title') else ""
                    creator = item.find('dc:creator')
                    user_handle = creator.get_text().strip() if creator else "News"
                    handle = user_handle.replace("@", "")
                    avatar_url = enforce_https(f"{base}/{handle}/avatar")
                    
                    media_url = None
                    desc = item.find('description')
                    if desc:
                        ds = BeautifulSoup(desc.get_text(), 'html.parser')
                        img = ds.find('img')
                        if img and img.get('src'):
                            src = img['src']
                            media_url = enforce_https(f"{base}{src}" if src.startswith('/') else src)
                        
                        if not media_url:
                            a = ds.find('a', href=lambda h: h and ('/pic/media' in h or '/pic/video' in h))
                            if a and a.get('href'):
                                src = a['href']
                                media_url = enforce_https(f"{base}{src}" if src.startswith('/') else src)

                    results.append({
                        "headline_text": title,
                        "media_url": media_url,
                        "avatar_url": avatar_url,
                        "channel_name": handle,
                        "source_platform": "verified_swarm",
                        "timestamp": item.find('pubDate').get_text() if item.find('pubDate') else datetime.now().isoformat()
                    })
                except: continue
            
            print(f"DEBUG: V66.6 Success - {len(results)} items from {base}", file=sys.stderr)
            return results
        except Exception as e:
            print(f"ERROR: Parsing failed: {str(e)}", file=sys.stderr)
            return []

if __name__ == "__main__":
    try:
        data = asyncio.run(fetch_via_scrapedo())
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        print(f"MAIN_ERROR: {str(e)}", file=sys.stderr)
        print(json.dumps([]))
