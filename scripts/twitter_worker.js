const cheerio = require('cheerio');

/**
 * V1.0: Real-Time Twitter List Scraper (Scrape.do Premium + RSSHub Swarm)
 * Target List: 2031445708524421549
 */

const SCRAPEDO_KEY = process.env.SCRAPEDO_API_KEY || "adb11bc4e66248e186ac5316a1d4cf83a3bf18168cf";
const LIST_ID = "2031445708524421549";
const RSSHUB_BRIDGES = [
    'https://rsshub.app',
    'https://rsshub.rssforever.com', 
    'https://rsshub.moeyy.cn',
    'https://rss.shab.fun',
    'https://rss.owo.nz',
    'https://rsshub.izit.io'
];
const RSS_APP_FEED = 'https://rss.app/feeds/v1.1/wkS1m06mHt2j7163.json';

async function fetchTwitterBruteForce() {
    let results = [];
    
    // 1. Primary: RSS.app Managed Feed (Most reliable, no credits needed)
    try {
        process.stderr.write(`📡 [Twitter] Checking RSS.app Primary...\n`);
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
        process.stderr.write(`⚠️ [Twitter] RSS.app primary check failed: ${e.message}\n`);
    }

    // 2. Secondary: RSSHub Swarm with Scrape.do
    process.stderr.write(`📡 [Twitter] Falling back to Scrape.do Swarm...\n`);
    for (const bridge of RSSHUB_BRIDGES) {
        if (bridge.includes('rsshub_instance_1')) continue; 
        const targetUrl = `${bridge}/twitter/list/${LIST_ID}`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(targetUrl)}&follow_redirect=true`;
        
        try {
            const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
            if (resp.status === 401 || resp.status === 403) {
                process.stderr.write(`❌ [Twitter] Scrape.do Token Invalid/Expired (Error ${resp.status})\n`);
                break; // Don't keep trying if the token is dead
            }
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const xml = await resp.text();
            results = parseTwitterRSS(xml);
            if (results && results.length > 3) {
                process.stderr.write(`✅ [Twitter] Success via ${bridge}\n`);
                return results;
            }
        } catch (e) {
            process.stderr.write(`⚠️ [Twitter] Bridge ${bridge} failed: ${e.message}\n`);
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
