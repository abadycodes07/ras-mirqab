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
# V66.1: Resilient Scraper (Debug-Ready)
# ═══════════════════════════════════════════════

TWITTER_LIST_ID = os.getenv("TWITTER_LIST_ID", "2031445708524421549")
SCRAPEDO_API_KEY = os.getenv("SCRAPEDO_API_KEY", "20a03e1d412a44c1a19277ba8feb43be000d574775d")

# Primary Nitter instance (poast.org)
NITTER_BASE = "https://nitter.poast.org"

def enforce_https(url):
    if not url: return None
    if url.startswith('//'): return 'https:' + url
    if url.startswith('http://'): return 'https' + url[4:]
    return url

async def fetch_via_scrapedo():
    """V66.1: Hardened extraction & verbose error reporting."""
    print(f"DEBUG: [V66.1] Starting Scrape.do Fetch...", file=sys.stderr)
    
    if not SCRAPEDO_API_KEY:
        print("ERROR: SCRAPEDO_API_KEY missing.", file=sys.stderr)
        return []

    target_url = f"{NITTER_BASE}/i/lists/{TWITTER_LIST_ID}/rss"
    encoded_url = quote(target_url)
    api_url = f"https://api.scrape.do?token={SCRAPEDO_API_KEY}&url={encoded_url}&super=true"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(api_url, timeout=45.0)
            if resp.status_code != 200:
                print(f"ERROR: Scrape.do Status {resp.status_code}", file=sys.stderr)
                return []
                
            soup = BeautifulSoup(resp.text, 'xml')
            items = soup.find_all('item')
            
            results = []
            for item in items[:40]:
                try:
                    title = item.find('title').get_text().strip() if item.find('title') else ""
                    creator = item.find('dc:creator')
                    user_handle = creator.get_text().strip() if creator else "News"
                    handle = user_handle.replace("@", "")
                    
                    # Avatar with HTTPS
                    avatar_url = enforce_https(f"{NITTER_BASE}/{handle}/avatar")
                    
                    # Hardened Media Extraction V66.1
                    media_url = None
                    desc = item.find('description')
                    if desc:
                        desc_soup = BeautifulSoup(desc.get_text(), 'html.parser')
                        
                        # 1. Look for .still-image or direct img
                        img = desc_soup.find('img')
                        if img and img.get('src'):
                            src = img['src']
                            raw_url = NITTER_BASE + src if src.startswith('/') else src
                            media_url = enforce_https(raw_url)
                        
                        # 2. Look for video/media links if no img or to double check
                        if not media_url:
                            a_media = desc_soup.find('a', href=lambda h: h and ('/pic/media' in h or '/pic/video' in h))
                            if a_media and a_media.get('href'):
                                src = a_media['href']
                                raw_url = NITTER_BASE + src if src.startswith('/') else src
                                media_url = enforce_https(raw_url)

                    pub_date = item.find('pubDate').get_text() if item.find('pubDate') else datetime.now().isoformat()
                    
                    results.append({
                        "headline_text": title,
                        "media_url": media_url,
                        "avatar_url": avatar_url,
                        "channel_name": handle,
                        "source_platform": "scrapedo_nitter",
                        "timestamp": pub_date
                    })
                except: continue
            
            print(f"DEBUG: V66.1 Sync Complete - {len(results)} items.", file=sys.stderr)
            return results
            
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return []

if __name__ == "__main__":
    try:
        data = asyncio.run(fetch_via_scrapedo())
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        print(f"MAIN_ERROR: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        print(json.dumps([]))
