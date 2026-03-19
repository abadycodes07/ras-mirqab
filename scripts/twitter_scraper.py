import asyncio
import json
import sys
import os
from twscrape import API, AccountsPool, gather
from apify_client import ApifyClient
from datetime import datetime

# V58.0: Robust 2-Layer "GraphQL + Apify" Scraper
# Targeted List: https://x.com/i/lists/2031445708524421549
TWITTER_LIST_ID = int(os.getenv("TWITTER_LIST_ID", "2031445708524421549"))
APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")
APIFY_ACTOR_ID = "apidojo/tweet-scraper"

async def layer1_twscrape():
    """Layer 1: GraphQL API bypass via twscrape (Free & Fast)"""
    try:
        pool = AccountsPool() 
        api = API(pool)
        
        # Auto-provision accounts from environment variable if needed
        # Format: username:password:email:email_password|user2:pass2...
        accounts_raw = os.getenv("TWITTER_ACCOUNTS")
        if accounts_raw:
            # Check if we have active accounts
            active_accounts = await pool.accounts()
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
                await api.pool.login_all()
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

def layer2_apify():
    """Layer 2: Professional Residential Proxy Scraper (Apify Fallback)"""
    print("DEBUG: Initiating Layer 2 (Apify)...", file=sys.stderr)
    try:
        client = ApifyClient(APIFY_API_TOKEN)
        
        run_input = {
            "startUrls": [f"https://x.com/i/lists/{TWITTER_LIST_ID}"],
            "maxItems": 20,
            "sort": "Latest"
        }
        
        # Run the Apify actor
        run = client.actor(APIFY_ACTOR_ID).call(run_input=run_input)
        
        results = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append({
                "headline_text": (item.get("text") or item.get("full_text") or "").replace("\n", " ").strip(),
                "media_url": item.get("extended_entities", {}).get("media", [{}])[0].get("media_url_https") or item.get("entities", {}).get("media", [{}])[0].get("media_url_https"),
                "channel_name": item.get("author", {}).get("name") or item.get("author", {}).get("userName") or "Unknown",
                "source_platform": "apify",
                "timestamp": item.get("createdAt") or datetime.now().isoformat()
            })
        return results
    except Exception as e:
        print(f"Layer 2 (Apify) failed: {e}", file=sys.stderr)
        return []

async def fetch_breaking_news():
    # Attempt Layer 1
    data = await layer1_twscrape()
    
    # Fallback to Layer 2 if Layer 1 failed (None) or returned no items ([])
    if not data or len(data) == 0:
        print("DEBUG: Layer 1 returned no data. Falling back to Layer 2.", file=sys.stderr)
        data = layer2_apify()
        
    return data

if __name__ == "__main__":
    try:
        data = asyncio.run(fetch_breaking_news())
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        print(json.dumps([]))
