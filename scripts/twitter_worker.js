const cheerio = require('cheerio');

/**
 * V75.1: Ultimate Iron-Grip Twitter Scraper
 * Targeting Syndication API (Primary) and Web UI (Secondary)
 */

const SCRAPEDO_KEY = process.env.SCRAPEDO_API_KEY || "adb11bc4e66248e186ac5316a1d4cf83a3bf18168cf";
const LIST_ID = "2031445708524421549";
const NITTER_MIRRORS = [
    'https://nitter.net', 'https://nitter.cz', 'https://nitter.it',
    'https://nitter.privacydev.net', 'https://nitter.dafrary.com'
];

async function fetchTwitterBruteForce() {
    let results = [];

    // 1. PRIMARY: Syndication API (Premium Headless + Super Proxy)
    try {
        process.stderr.write(`📡 [Twitter] V75.2: Syndication Premium Scrape...\n`);
        const synUrl = `https://syndication.twitter.com/srv/timeline-profile/screen-name/AlArabiya_Brk`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(synUrl)}&render=true&super=true&wait=5000`;
        
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(90000) });
        if (resp.ok) {
            const html = await resp.text();
            results = parseTwitterSyndication(html);
            if (results && results.length > 5) {
                process.stderr.write(`✅ [Twitter] Success via Syndication (${results.length} items)\n`);
                return results;
            }
        }
    } catch (e) { process.stderr.write(`⚠️ [Twitter] Syndication Failed: ${e.message}\n`); }

    // 2. SECONDARY: Direct List (Premium Headless)
    try {
        process.stderr.write(`📡 [Twitter] V75.2: Direct List Scrape...\n`);
        const listUrl = `https://twitter.com/i/lists/${LIST_ID}`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(listUrl)}&render=true&super=true&wait=8000`;
        
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(120000) });
        if (resp.ok) {
            const html = await resp.text();
            results = parseTwitterWebUI(html);
            if (results && results.length > 5) {
                process.stderr.write(`✅ [Twitter] Success via Direct UI (${results.length} items)\n`);
                return results;
            }
        }
    } catch (e) { process.stderr.write(`⚠️ [Twitter] Direct UI Failed: ${e.message}\n`); }

    // 3. TERTIARY: Nitter Swarm
    process.stderr.write(`📡 [Twitter] V75.1: Nitter Swarm...\n`);
    for (const mirror of NITTER_MIRRORS) {
        try {
            const rssUrl = `${mirror}/i/lists/${LIST_ID}/rss`;
            const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(rssUrl)}&follow_redirect=true`;
            const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
            if (resp.ok) {
                const xml = await resp.text();
                results = parseTwitterRSS(xml);
                if (results && results.length > 5) return results;
            }
        } catch (e) {}
    }

    return [];
}

function parseTwitterSyndication(html) {
    try {
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (!jsonMatch) return [];
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

function parseTwitterWebUI(html) {
    const results = [];
    try {
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            const instructions = data.props?.pageProps?.timeline?.instructions || [];
            instructions.forEach(inst => {
                if (inst.type === 'TimelineAddEntries') {
                    inst.entries.forEach(e => {
                        const t = e.content?.itemContent?.tweet_results?.result?.legacy;
                        const u = e.content?.itemContent?.tweet_results?.result?.core?.user_results?.result?.legacy;
                        if (t) {
                            results.push({
                                title: t.full_text || "",
                                link: `https://x.com/${u?.screen_name || 'i'}/status/${t.id_str}`,
                                pubDate: new Date(t.created_at).toISOString(),
                                source: "twitter",
                                sourceHandle: u?.screen_name || "News",
                                sourceName: u?.name || "News",
                                mediaUrl: t.entities?.media?.[0]?.media_url_https || null
                            });
                        }
                    });
                }
            });
        }
    } catch (e) {}
    return results;
}

function parseTwitterRSS(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });
    const results = [];
    $('item').each((i, el) => {
        const $item = $(el);
        const link = $item.find('link').text().trim();
        let handle = "News";
        const linkMatch = link.match(/https?:\/\/[^\/]+\/([^\/]+)\/status/);
        if (linkMatch) handle = linkMatch[1];
        const description = $item.find('description').text();
        let mediaUrl = null;
        if (description) {
            const imgMatch = description.match(/<img src="([^"]+)"/);
            if (imgMatch) mediaUrl = imgMatch[1];
        }
        results.push({
            title: $item.find('title').text().replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
            link,
            pubDate: $item.find('pubDate').text().trim(),
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
        process.stdout.write(JSON.stringify(items || [], null, 2));
    } catch (e) {
        process.stdout.write(JSON.stringify([], null, 2));
    }
}

main();
