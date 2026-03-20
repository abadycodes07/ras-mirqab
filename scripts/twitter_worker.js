const cheerio = require('cheerio');

/**
 * V1.0: Real-Time Twitter List Scraper (Scrape.do Premium + RSSHub Swarm)
 * Target List: 2031445708524421549
 */

const SCRAPEDO_KEY = process.env.SCRAPEDO_API_KEY || "adb11bc4e66248e186ac5316a1d4cf83a3bf18168cf";
const LIST_ID = "2031445708524421549";
const NITTER_MIRRORS = [
    'https://nitter.net',
    'https://nitter.cz',
    'https://nitter.it',
    'https://nitter.privacydev.net',
    'https://nitter.dafrary.com',
    'https://nitter.pussthecat.org',
    'https://nitter.no-logs.com'
];
const RSS_APP_FEED = 'https://rss.app/feeds/v1.1/wkS1m06mHt2j7163.json';

async function fetchTwitterBruteForce() {
    let results = [];
    
    // 1. Primary: Direct HTML Headless Scrape (V74.0 - Iron Grip)
    try {
        process.stderr.write(`📡 [Twitter] Trying Direct Headless Scrape via Scrape.do (V74.0)...\n`);
        const targetUrl = `https://syndication.twitter.com/srv/timeline-profile/screen-name/AlArabiya_Brk`; // Example, or use List if possible
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(targetUrl)}&render=true`;
        
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(25000) });
        if (resp.ok) {
            const html = await resp.text();
            // Simple parsing for Syndication HTML
            const items = parseTwitterSyndication(html);
            if (items && items.length > 5) {
                process.stderr.write(`✅ [Twitter] Success via Syndication Headless (${items.length} items)\n`);
                return items;
            }
        }
    } catch (e) {
        process.stderr.write(`⚠️ [Twitter] Headless Failed: ${e.message}\n`);
    }

    // 2. Secondary: Nitter RSS Swarm via Scrape.do Proxy
    process.stderr.write(`📡 [Twitter] Starting Nitter/Scrape.do Swarm (V74.0)...\n`);
    for (const mirror of NITTER_MIRRORS) {
        const targetUrl = `${mirror}/i/lists/${LIST_ID}/rss`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(targetUrl)}&follow_redirect=true`;
        
        try {
            const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
            if (resp.status === 401 || resp.status === 403) {
                process.stderr.write(`❌ [Twitter] Scrape.do Auth Failed\n`);
                break;
            }
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const xml = await resp.text();
            results = parseTwitterRSS(xml);
            if (results && results.length > 5) {
                process.stderr.write(`✅ [Twitter] Success via Nitter (${mirror}) - ${results.length} items\n`);
                return results;
            }
        } catch (e) {
            process.stderr.write(`⚠️ [Twitter] Mirror ${mirror} failed: ${e.message}\n`);
        }
    }

    // 3. Final Fallback: RSS.app Managed Feed (Often Stale but Consistent)
    try {
        process.stderr.write(`📡 [Twitter] Falling back to RSS.app (V74-Backup)...\n`);
        const resp = await fetch(RSS_APP_FEED, { signal: AbortSignal.timeout(8000) });
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.items && data.items.length > 0) {
                process.stderr.write(`✅ [Twitter] Success via RSS.app Fallback\n`);
                return data.items.map(it => ({
                    title: it.title,
                    link: it.url || it.link,
                    pubDate: it.date_published || it.pubDate || new Date().toISOString(),
                    source: "twitter",
                    sourceHandle: it.author?.name?.replace(/@/g, '') || "News",
                    sourceName: it.author?.name?.replace(/@/g, '') || "News",
                    mediaUrl: it.image || (it.attachments?.[0]?.url) || null
                }));
            }
        }
    } catch (e) {
        process.stderr.write(`⚠️ [Twitter] RSS.app Failed: ${e.message}\n`);
    }

    return [];
}

function parseTwitterSyndication(html) {
    const $ = cheerio.load(html);
    const results = [];
    const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!jsonMatch) return [];
    try {
        const data = JSON.parse(jsonMatch[1]);
        const tweets = data.props.pageProps.timeline.entries;
        return tweets.map(e => {
            const t = e.content.tweet;
            if (!t) return null;
            return {
                title: t.full_text || "",
                link: `https://x.com/i/status/${t.id_str}`,
                pubDate: new Date(t.created_at).toISOString(),
                source: "twitter",
                sourceHandle: t.user.screen_name,
                sourceName: t.user.name,
                mediaUrl: t.entities.media?.[0]?.media_url_https || null
            };
        }).filter(Boolean);
    } catch (e) { return []; }
}

function parseTwitterRSS(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });
    const results = [];
    
    $('item').each((i, el) => {
        if (i >= 50) return; // Keep it high but manageable
        const $item = $(el);
        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim();
        const pubDate = $item.find('pubDate').text().trim();
        
        // V73: Deep Handle Extraction from Link
        // Pattern: https://nitter.net/handle/status/123...
        let handle = "News";
        const linkMatch = link.match(/https?:\/\/[^\/]+\/([^\/]+)\/status/);
        if (linkMatch) {
            handle = linkMatch[1];
        } else {
            const creator = $item.find('dc\\:creator').text().trim();
            if (creator) handle = creator.replace('@', '');
        }

        const description = $item.find('description').text();
        let mediaUrl = null;
        if (description) {
            const match = description.match(/<img src="([^"]+)"/);
            if (match) mediaUrl = match[1];
        }

        results.push({
            title: title.replace(/<!\[CDATA\[|\]\]>/g, '').substring(0, 500),
            link,
            pubDate,
            source: "twitter",
            sourceHandle: handle,
            sourceName: handle, 
            mediaUrl
        });
    });
    return results;
}

async function main() {
    try {
        const items = await fetchTwitterBruteForce();
        // Zero-fail output
        process.stdout.write(JSON.stringify(items || [], null, 2));
    } catch (e) {
        process.stdout.write(JSON.stringify([], null, 2));
    }
}

main();
