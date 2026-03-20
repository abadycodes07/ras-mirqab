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

    // 1. PRIMARY: Syndication LIST API
    try {
        process.stderr.write(`📡 [Twitter] V75.8: Syndication LIST Scrape (List: ${LIST_ID})...\n`);
        const synUrl = `https://syndication.twitter.com/srv/timeline-list/list-id/${LIST_ID}`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(synUrl)}&render=true&super=true&wait=5000`;
        
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(90000) });
        if (resp.ok) {
            const html = await resp.text();
            if (html.includes("auth_token") || html.includes("Login")) {
                process.stderr.write(`⚠️ [Twitter] Syndication hit Auth Wall.\n`);
            } else {
                results = parseTwitterSyndication(html);
                if (results && results.length > 3) {
                    process.stderr.write(`✅ [Twitter] Success via Syndication LIST (${results.length} items)\n`);
                    return results;
                }
            }
        }
    } catch (e) { process.stderr.write(`⚠️ [Twitter] Syndication List Failed: ${e.message}\n`); }

    // 2. SECONDARY: Direct Web UI List
    try {
        process.stderr.write(`📡 [Twitter] V75.8: Direct List Scrape...\n`);
        const listUrl = `https://twitter.com/i/lists/${LIST_ID}`;
        const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(listUrl)}&render=true&super=true&wait=8000`;
        
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(120000) });
        if (resp.ok) {
            const html = await resp.text();
            if (html.includes("login-form") || html.includes("Sign in")) {
                process.stderr.write(`⚠️ [Twitter] Direct UI hit Login Wall.\n`);
            } else {
                results = parseTwitterWebUI(html);
                if (results && results.length > 3) {
                    process.stderr.write(`✅ [Twitter] Success via Direct UI (${results.length} items)\n`);
                    return results;
                }
            }
        }
    } catch (e) { process.stderr.write(`⚠️ [Twitter] Direct UI Failed: ${e.message}\n`); }

    // 3. TERTIARY: High-Reliability RSS Recovery (ZERO CREDITS)
    try {
        process.stderr.write(`📡 [Twitter] V75.8: RSS Recovery (Zero Credits)...\n`);
        // Using a public RSS fallback for the list or key accounts
        const rssUrl = `https://rss.app/feeds/v1.1/wkS1m06mHt2j7163.json`; // Re-using user's reliable RSS feed
        const resp = await fetch(rssUrl, { signal: AbortSignal.timeout(30000) });
        if (resp.ok) {
            const data = await resp.json();
            const fallback = (data.items || []).filter(it => it.url?.includes('twitter.com') || it.url?.includes('x.com')).map(it => ({
                title: it.title || it.description || "",
                link: it.url || it.link,
                pubDate: it.date_published || new Date().toISOString(),
                source: "twitter",
                sourceHandle: "News",
                sourceName: "تويتر",
                mediaUrl: it.image || it.thumbnail || null
            }));
            if (fallback && fallback.length > 0) {
                process.stderr.write(`✅ [Twitter] Success via RSS Recovery (${fallback.length} items)\n`);
                return fallback;
            }
        }
    } catch (e) { process.stderr.write(`⚠️ [Twitter] RSS Recovery Failed: ${e.message}\n`); }

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
            // Search deeper for entries (Twitter UI often nests these differently for Lists)
            let entries = [];
            const instructions = data.props?.pageProps?.timeline?.instructions || 
                               data.props?.pageProps?.initialTimeline?.instructions || [];
            
            instructions.forEach(inst => {
                if (inst.type === 'TimelineAddEntries' || inst.type === 'TimelinePinEntry') {
                    entries = entries.concat(inst.entries || [inst.entry].filter(Boolean));
                }
            });

            entries.forEach(e => {
                const result = e.content?.itemContent?.tweet_results?.result;
                const t = result?.legacy || result?.tweet?.legacy;
                const u = result?.core?.user_results?.result?.legacy || result?.tweet?.core?.user_results?.result?.legacy;
                
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
    } catch (e) { process.stderr.write(`⚠️ [Twitter] UI Parse Exception: ${e.message}\n`); }
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
