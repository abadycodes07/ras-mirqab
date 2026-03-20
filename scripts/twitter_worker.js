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
    'https://nitter.dafrary.com'
];
const RSS_APP_FEED = 'https://rss.app/feeds/v1.1/wkS1m06mHt2j7163.json';

async function fetchTwitterBruteForce() {
    let results = [];
    
    // 1. Primary: RSS.app Managed Feed (Zero-Credit Check)
    try {
        process.stderr.write(`📡 [Twitter] Checking RSS.app...\n`);
        const resp = await fetch(RSS_APP_FEED, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.items && data.items.length > 0) {
                process.stderr.write(`✅ [Twitter] Success via RSS.app\n`);
                return data.items.map(it => ({
                    title: it.title,
                    link: it.url || it.link,
                    pubDate: it.date_published || it.pubDate || new Date().toISOString(),
                    source: "twitter",
                    sourceHandle: it.author?.name || "News",
                    sourceName: it.author?.name || "News",
                    mediaUrl: it.image || (it.attachments?.[0]?.url) || null
                }));
            }
        }
    } catch (e) {
        process.stderr.write(`⚠️ [Twitter] RSS.app skipped: ${e.message}\n`);
    }

    // 2. Hybrid: Nitter RSS Swarm via Scrape.do Proxy
    process.stderr.write(`📡 [Twitter] Starting Nitter/Scrape.do Swarm...\n`);
    for (const mirror of NITTER_MIRRORS) {
        const targetUrl = `${mirror}/i/lists/${LIST_ID}/rss`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(targetUrl)}&follow_redirect=true`;
        
        try {
            const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(12000) });
            if (resp.status === 401 || resp.status === 403) {
                process.stderr.write(`❌ [Twitter] Scrape.do Auth Failed (Use Proxy Fallback)\n`);
                break;
            }
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const xml = await resp.text();
            results = parseTwitterRSS(xml);
            if (results && results.length > 2) {
                process.stderr.write(`✅ [Twitter] Success via Nitter (${mirror})\n`);
                return results;
            }
        } catch (e) {
            process.stderr.write(`⚠️ [Twitter] Mirror ${mirror} failed: ${e.message}\n`);
        }
    }

    return [];
}

function parseTwitterRSS(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });
    const results = [];
    
    $('item').each((i, el) => {
        if (i >= 100) return; // Increased depth for completeness
        const $item = $(el);
        const title = $item.find('title').text().trim();
        const link = $item.find('link').text().trim();
        const creator = $item.find('dc\\:creator').text().trim() || "News";
        const pubDate = $item.find('pubDate').text().trim();
        
        const description = $item.find('description').text();
        let mediaUrl = null;
        if (description) {
            const match = description.match(/<img src="([^"]+)"/);
            if (match) mediaUrl = match[1];
        }

        results.push({
            title: title.replace(/<!\[CDATA\[|\]\]>/g, ''),
            link,
            pubDate,
            source: "twitter",
            sourceHandle: creator.replace('@', ''),
            sourceName: creator.replace('@', ''), // Handle names mapping can be added in proxy
            mediaUrl
        });
    });
    return results;
}

async function main() {
    try {
        const items = await fetchTwitterBruteForce();
        process.stdout.write(JSON.stringify(items, null, 2));
    } catch (e) {
        process.stdout.write(JSON.stringify([], null, 2));
    }
}

main();
