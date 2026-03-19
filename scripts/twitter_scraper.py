import asyncio
import json
import sys
import os
from twscrape import API, AccountsPool, gather
import httpx
from bs4 import BeautifulSoup
from datetime import datetime

# V58.0: Robust 2-Layer "GraphQL + Apify" Scraper
# Targeted List: https://x.com/i/lists/2031445708524421549
TWITTER_LIST_ID = int(os.getenv("TWITTER_LIST_ID", "2031445708524421549"))
# Nitter instances for fallback (prioritizing RSS-enabled ones)
NITTER_INSTANCES = [
    "https://nitter.perennialte.ch",
    "https://nitter.cz",
    "https://nitter.it",
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

async def fetch_breaking_news():
    # Attempt Layer 1
    data = await layer1_twscrape()
    
    # Fallback to Layer 2 if Layer 1 failed (None) or returned no items ([])
    if not data or len(data) == 0:
        print("DEBUG: Layer 1 returned no data. Falling back to Layer 2.", file=sys.stderr)
        data = layer2_nitter()
        
    return data

if __name__ == "__main__":
    try:
        data = asyncio.run(fetch_breaking_news())
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        print(json.dumps([]))
