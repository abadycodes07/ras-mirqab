import asyncio
import json
import sys
import os
import httpx
from bs4 import BeautifulSoup
from datetime import datetime
from urllib.parse import quote

# ═══════════════════════════════════════════════
# V1.0: Telegram RSS Scraper (RSSHub + Scrape.do)
# ═══════════════════════════════════════════════

SCRAPEDO_API_KEY = os.getenv("SCRAPEDO_API_KEY", "adb11bc4e66248e186ac5316a1d4cf83a3bf18168cf")

TG_CHANNELS = [
    "ajanews",
    "alhadath_brk",
    "alarabiya_brk",
    "SkyNewsArabia_Breaking",
    "RT_Arabic",
    "SABQ_NEWS",
    "AjelNews24",
    "R_K_A_N_2",
    "Sama_TV_Official"
]

RSSHUB_BRIDGES = [
    "https://rsshub.rssforever.com",
    "https://rsshub.moeyy.cn",
    "https://rss.shab.fun",
    "https://rss.owo.nz"
]

def enforce_https(url):
    if not url: return None
    if url.startswith('//'): return 'https:' + url
    if url.startswith('http://'): return 'https' + url[4:]
    return url

async def fetch_from_bridge(client, bridge, channel):
    """Fetch Telegram RSS from RSSHub bridge via Scrape.do."""
    target_url = f"{bridge}/telegram/channel/{channel}"
    
    if not SCRAPEDO_API_KEY:
        try:
            resp = await client.get(target_url, timeout=10.0)
            if resp.status_code == 200: return resp.text
        except: pass
        return None

    encoded_url = quote(target_url)
    api_url = f"https://api.scrape.do?token={SCRAPEDO_API_KEY}&url={encoded_url}&follow_redirect=true"
    
    try:
        resp = await client.get(api_url, timeout=30.0)
        if resp.status_code == 200:
            return resp.text
    except Exception as e:
        print(f"DEBUG: Scrape.do failed for {channel} on {bridge}: {str(e)}", file=sys.stderr)
    
    return None

async def scrape_channel(client, channel):
    """Try multiple bridges for a single channel."""
    for bridge in RSSHUB_BRIDGES:
        html = await fetch_from_bridge(client, bridge, channel)
        if html and len(html) > 500:
            try:
                soup = BeautifulSoup(html, 'xml')
                items = soup.find_all('item')
                results = []
                for item in items[:15]:
                    title = item.find('title').get_text().strip() if item.find('title') else ""
                    link = item.find('link').get_text().strip() if item.find('link') else f"https://t.me/{channel}"
                    pubDate = item.find('pubDate').get_text() if item.find('pubDate') else datetime.now().isoformat()
                    
                    description = item.find('description').get_text() if item.find('description') else ""
                    media_url = None
                    if description:
                        ds = BeautifulSoup(description, 'html.parser')
                        img = ds.find('img')
                        if img and img.get('src'):
                            media_url = enforce_https(img['src'])
                        
                        if not media_url:
                            # Also check for video/media links in description
                            a = ds.find('a', href=lambda h: h and ('/file' in h or 'cdn-telegram' in h))
                            if a: media_url = enforce_https(a['href'])

                    results.append({
                        "title": title,
                        "link": link,
                        "pubDate": pubDate,
                        "source": "telegram",
                        "sourceHandle": channel,
                        "sourceName": channel,
                        "mediaUrl": media_url
                    })
                return results
            except Exception as e:
                print(f"DEBUG: Parse failed for {channel}: {str(e)}", file=sys.stderr)
    return []

async def main():
    async with httpx.AsyncClient() as client:
        tasks = [scrape_channel(client, ch) for ch in TG_CHANNELS]
        all_results = await asyncio.gather(*tasks)
        
        flat_results = [item for sublist in all_results for item in sublist]
        # Sort by date
        try:
            flat_results.sort(key=lambda x: x.get('pubDate', ''), reverse=True)
        except: pass
        
        print(json.dumps(flat_results, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
