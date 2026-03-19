import asyncio
import json
import sys
import os
import httpx
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import quote

# V62.0: Monolithic Scrape.do Scraper (Target: Twitter List via Nitter RSS Proxy)
TWITTER_LIST_ID = os.getenv("TWITTER_LIST_ID", "2031445708524421549")
SCRAPEDO_API_KEY = os.getenv("SCRAPEDO_API_KEY", "20a03e1d412a44c1a19277ba8feb43be000d574775d")

# Primary Nitter instance to proxy
NITTER_BASE = "https://nitter.perennialte.ch"

async def fetch_via_scrapedo():
    """V62.0: The single source of truth for Twitter data logic."""
    print(f"DEBUG: [V62.0] Initiating Scrape.do Proxy Fetch...", file=sys.stderr)
    
    if not SCRAPEDO_API_KEY:
        print("ERROR: SCRAPEDO_API_KEY is missing. Cannot proceed.", file=sys.stderr)
        return []

    # Construct the Nitter RSS URL for the list
    target_url = f"{NITTER_BASE}/i/lists/{TWITTER_LIST_ID}/rss"
    encoded_url = quote(target_url)
    
    # Construct Scrape.do API call
    # We use super=true for best proxy rotation to avoid Nitter blocks
    api_url = f"https://api.scrape.do?token={SCRAPEDO_API_KEY}&url={encoded_url}&super=true"
    
    try:
        async with httpx.AsyncClient() as client:
            print(f"DEBUG: Calling Scrape.do for {target_url}...", file=sys.stderr)
            resp = await client.get(api_url, timeout=45.0)
            
            if resp.status_code != 200:
                print(f"ERROR: Scrape.do returned status {resp.status_code}", file=sys.stderr)
                return []
                
            # Parse XML
            soup = BeautifulSoup(resp.text, 'xml')
            items = soup.find_all('item')
            
            if not items:
                print(f"DEBUG: No items found in RSS response.", file=sys.stderr)
                # Check for "RSS feed is disabled" or blocking messages in body
                if "RSS feed is disabled" in resp.text:
                    print(f"ERROR: RSS feed is disabled on this Nitter instance.", file=sys.stderr)
                return []
                
            results = []
            for item in items[:40]: # Capture a generous amount of tweets
                try:
                    title = item.find('title').get_text().strip() if item.find('title') else ""
                    
                    creator = item.find('dc:creator')
                    user_handle = creator.get_text().strip() if creator else "News"
                    # Clean handle (remove @ if present)
                    handle = user_handle.replace("@", "")
                    
                    # Construct Avatar URL (Nitter convention)
                    avatar_url = f"{NITTER_BASE}/{handle}/avatar"
                    
                    # Extract media from description
                    media_url = None
                    desc = item.find('description')
                    if desc:
                        desc_soup = BeautifulSoup(desc.get_text(), 'html.parser')
                        img = desc_soup.find('img')
                        if img: 
                            src = img['src']
                            media_url = NITTER_BASE + src if src.startswith('/') else src
                    
                    pub_date = item.find('pubDate').get_text() if item.find('pubDate') else datetime.now().isoformat()
                    
                    results.append({
                        "headline_text": title,
                        "media_url": media_url,
                        "avatar_url": avatar_url,
                        "channel_name": handle,
                        "source_platform": "scrapedo_nitter",
                        "timestamp": pub_date
                    })
                except Exception as e:
                    print(f"DEBUG: Error parsing item: {e}", file=sys.stderr)
                    continue
            
            print(f"DEBUG: Successfully fetched {len(results)} items via Scrape.do.", file=sys.stderr)
            return results
            
    except Exception as e:
        print(f"ERROR: fetch_via_scrapedo exception: {e}", file=sys.stderr)
        return []

if __name__ == "__main__":
    try:
        data = asyncio.run(fetch_via_scrapedo())
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        print(json.dumps([]))
