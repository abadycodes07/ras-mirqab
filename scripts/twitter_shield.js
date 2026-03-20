const cheerio = require('cheerio');

/**
 * V75.1: Ultimate Iron-Grip Twitter Scraper
 * Targeting Syndication API (Primary) and Web UI (Secondary)
 */

const SCRAPEDO_KEY = process.env.SCRAPEDO_API_KEY || "76445d6feeb2455f80f40a3e27b1dcb9d6e3a545b0c";
const LIST_ID = "2031445708524421549";
const NITTER_MIRRORS = []; // DISABLED FOR CREDIT SHIELD

async function fetchTwitterBruteForce() {
    let results = [];

    // 1. PRIMARY: Syndication LIST API (The Specific List requested)
    try {
        process.stderr.write(`📡 [Twitter] V75.5: Syndication LIST Premium Scrape (List: ${LIST_ID})...\n`);
        const synUrl = `https://syndication.twitter.com/srv/timeline-list/list-id/${LIST_ID}`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(synUrl)}&render=true&super=true&wait=5000`;
        
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(90000) });
        if (resp.ok) {
            const html = await resp.text();
            results = parseTwitterSyndication(html);
            if (results && results.length > 5) {
                process.stderr.write(`✅ [Twitter] Success via Syndication LIST (${results.length} items)\n`);
                return results;
            }
        }
    } catch (e) { process.stderr.write(`⚠️ [Twitter] Syndication List Failed: ${e.message}\n`); }

    // 2. SECONDARY: Direct Web UI List (Premium Headless)
    try {
        process.stderr.write(`📡 [Twitter] V75.5: Direct List Scrape...\n`);
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

    // 3. TERTIARY: Syndication Profile (Fallback)
    try {
        process.stderr.write(`📡 [Twitter] V75.4: Syndication Profile Fallback...\n`);
        const synUrl = `https://syndication.twitter.com/srv/timeline-profile/screen-name/AlArabiya_Brk`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(synUrl)}&render=true&super=true&wait=5000`;
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
        if (resp.ok) {
            const html = await resp.text();
            const fallback = parseTwitterSyndication(html);
            if (fallback && fallback.length > 5) return fallback;
        }
    } catch (e) {}

    process.stderr.write(`📡 [Twitter] V75.5: Nitter Swarm DISABLED.\n`);

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
