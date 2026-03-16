/* ═══════════════════════════════════════════════
   V4 UNIFIED LIST PROXY - RAS MIRQAB
   ═══════════════════════════════════════════════ */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const REFRESH_INTERVAL = 30000; // 30 seconds - Highly efficient for single request
const LIST_ID = "2031445708524421549";
const RSSHUB_BRIDGES = [
    'https://rsshub.app',
    'https://rsshub.rssforever.com',
    'https://rsshub.moeyy.cn',
    'https://rss.shab.fun',
    'https://rss.lilydjwg.me',
    'https://rss.owo.nz',
    'https://rss.injuly.in'
];

const NITTER_INSTANCES = [
    'https://nitter.privacydev.net',
    'https://nitter.net',
    'https://nitter.no-logs.com',
    'https://nitter.unixfox.eu',
    'https://nitter.cz',
    'https://nitter.it',
    'https://nitter.1d4.us',
    'https://nitter.poast.org',
    'https://nitter.lacistube.im',
    'https://nitter.rawbit.ninja',
    'https://nitter.moomoo.me'
];

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

const PROXY_RETRY_LIMIT = 3;

const AVATAR_MAP = {
    'AsharqNewsBrk': 'public/logos/asharq2.jpg',
    'AlHadath': 'public/logos/alhadath3.png',
    'NewsNow4USA': 'public/logos/newsnow.jpg',
    'modgovksa': 'public/logos/modgovksa2.png',
    'alrougui': 'public/logos/alrougui.jpg',
    'alekhbariyaNews': 'public/logos/alekhbariya.jpg',
    'araReuters': 'https://www.reuters.com/pf/resources/images/reuters/favicon.ico',
    'RTonline_ar': 'public/logos/rt.png',
    'AlGhadTV': 'public/logos/aljazeera.png',
    'AlArabiya_Brk': 'public/logos/alarabiya.png',
    'SkyNewsArabia_B': 'public/logos/skynews.png',
    'SABQ_NEWS': 'public/logos/sabq.png',
    'AjelNews24': 'public/logos/ajelnews.jpg',
    'Alarabiya_brk': 'public/logos/alarabiya.png', // Aliases
    'SkyNewsArabia_Breaking': 'public/logos/skynews.png',
    'RT_Arabic': 'public/logos/rt.png',
    'alekhbariyabrk': 'public/logos/alekhbariya.jpg',
    'ajmubasher': 'public/logos/aljazeera.png',
    'i24news-ar': 'public/logos/i24news.png',
    'sabq-org': 'public/logos/sabq.png',
    'ajanews': 'public/logos/ajanews_new.png',
    'alhadath_brk': 'public/logos/alhadath3.png'
};

// Optimization: Track the best mirror
let bestMirror = NITTER_INSTANCES[0];

// In-Memory Global Cache
let listNewsCache = [];
let sourceHealth = {}; // Tracks { handle: lastSeenTimestamp }

// CORS Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

/**
 * Parses Nitter RSS XML for a List (V4.5 - Enhanced Media Extraction)
 */
function parseListRSS(xml) {
    const items = [];
    const itemMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatch) {
        const content = match[1];
        
        // Extract Title
        const titleMatch = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || 
                          content.match(/<title>([\s\S]*?)<\/title>/);
        let fullTitle = (titleMatch ? titleMatch[1] : "").trim();
        
        // Extract Link
        const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
        let link = linkMatch ? linkMatch[1] : "";

        // Extract Handle
        const creatorMatch = content.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
        let handle = creatorMatch ? creatorMatch[1] : "";

        if (!handle) {
            const pathMatch = link.match(/\.com\/([^\/]+)\/status/) || link.match(/nitter\.[^\/]+\/([^\/]+)\/status/);
            if (pathMatch) handle = pathMatch[1];
        }
        if (!handle) handle = "News";

        // Extract Date
        const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        let pubDate = pubDateMatch ? pubDateMatch[1] : "";
        
        // Media/Thumbnail extraction from description (V4.6 - Robust Nitter Media)
        const descMatch = content.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || 
                         content.match(/<description>([\s\S]*?)<\/description>/);
        const desc = descMatch ? descMatch[1] : "";
        
        // Match both absolute and relative Nitter image paths
        const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i);
        let mediaUrl = imgMatch ? imgMatch[1] : null;
        
        if (mediaUrl && mediaUrl.startsWith('/')) {
            // Convert relative to absolute using the current mirror
            const mirrorBase = link.match(/^(https?:\/\/[^\/]+)/)?.[1];
            if (mirrorBase) mediaUrl = mirrorBase + mediaUrl;
        }

        // Fallback for avatar/media
        sourceHealth[handle] = Date.now();
        link = link.replace(/nitter\.[a-z.]+/g, 'x.com');

        if (fullTitle && pubDate) {
            items.push({
                title: fullTitle.replace(/<[^>]+>/g, '').trim(),
                link: link,
                pubDate: new Date(pubDate).toISOString(),
                source: 'twitter',
                sourceName: handle,
                sourceHandle: handle,
                image: mediaUrl,
                customAvatar: AVATAR_MAP[handle] || AVATAR_MAP[handle.toLowerCase()] || 'public/logos/default.png'
            });
        }
    }
    return items;
}

/**
 * Enhanced fetcher with rotation and stealth (Scrape.do style)
 */
async function stealthFetch(url, customHeaders = {}) {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const headers = {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        ...customHeaders
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, { 
            headers, 
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (e) {
        throw e;
    }
}

async function fetchTelegram(handle) {
    try {
        const response = await fetch(`https://t.me/s/${handle}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!response.ok) return [];
        const html = await response.text();
        const results = [];
        
        // Extract messages more robustly
        const messages = html.matchAll(/<div class="tgme_widget_message_wrap[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g);
        
        for (const msgMatch of messages) {
            const msgHtml = msgMatch[1];
            
            // Extract Text
            const textMatch = msgHtml.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
            const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : null;
            
            // Extract Time
            const timeMatch = msgHtml.match(/<time[^>]*datetime="([^"]*)"/);
            const time = timeMatch ? timeMatch[1] : null;
            
            // Extract Media (V4.6 - Enhanced Telegram Media)
            // Look for both message photo and channel preview media
            const photoMatch = msgHtml.match(/tgme_widget_message_photo_wrap[^>]*style="background-image:url\('([^']+)'\)"/i) ||
                               msgHtml.match(/<img[^>]+src="([^"]+)"/i);
            const mediaUrl = photoMatch ? photoMatch[1] : null;

            if (text && time) {
                results.push({
                    title: text.substring(0, 500),
                    source: 'telegram',
                    sourceName: handle,
                    sourceHandle: handle,
                    pubDate: new Date(time).toISOString(),
                    link: `https://t.me/s/${handle}`,
                    image: (handle === 'ajanews' || handle === 'alhadath_brk') ? AVATAR_MAP[handle] : mediaUrl,
                    customAvatar: AVATAR_MAP[handle] || AVATAR_MAP[handle.toLowerCase()] || 'public/logos/default.png'
                });
            }
        }
        
        return results.reverse().slice(0, 15);
    } catch (e) { 
        console.error(`Telegram fetch failed for ${handle}`, e);
        return []; 
    }
}

async function updateHybridCache() {
    const tgHandles = ['ajanews', 'alhadath_brk'];
    /**
     * Twitter Syndication Fetcher (High Stability)
     */
    const fetchTwitterSyndication = async (username) => {
        try {
            const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`;
            const html = await stealthFetch(url, {
                'Referer': 'https://platform.twitter.com/',
                'Origin': 'https://platform.twitter.com'
            });
            
            // Extract JSON from the __NEXT_DATA__ block or direct parsing
            const dataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (!dataMatch) return null;
            
            const data = JSON.parse(dataMatch[1]);
            const tweets = data.props.pageProps.timeline.entries;
            
            return tweets.map(entry => {
                const t = entry.content.tweet;
                if (!t) return null;
                return {
                    title: t.full_text,
                    link: `https://x.com/${username}/status/${t.id_str}`,
                    pubDate: new Date(t.created_at).toISOString(),
                    source: 'twitter',
                    sourceName: username,
                    sourceHandle: username,
                    image: t.entities?.media?.[0]?.media_url_https || null,
                    customAvatar: AVATAR_MAP[username] || 'public/logos/default.png'
                };
            }).filter(Boolean);
        } catch (e) {
            console.warn(`[Syndication] ❌ Failed for ${username}: ${e.message}`);
            return null;
        }
    };

    const fetchTwitter = async () => {
        // High Priority: Syndication API (per handle for critical ones)
        const criticalHandles = ['alrougui', 'AlHadath', 'AsharqNewsBrk'];
        let results = [];
        
        for (const handle of criticalHandles) {
            const items = await fetchTwitterSyndication(handle);
            if (items) results = [...results, ...items];
        }

        if (results.length > 5) return results;

        // Shuffle to distribute load
        const shuffledBridges = [...RSSHUB_BRIDGES].sort(() => Math.random() - 0.5);
        const shuffledNitter = [...NITTER_INSTANCES].sort(() => Math.random() - 0.5);

        // Attempt 1: RSSHub Bridges (High stability)
        for (const bridge of shuffledBridges) {
            try {
                const url = `${bridge}/twitter/list/${LIST_ID}`;
                console.log(`[RSSHub] 📡 Attempting bridge: ${bridge}`);
                const xml = await stealthFetch(url);
                if (xml.includes('<item>')) {
                    console.log(`[RSSHub] ✅ Success from ${bridge}`);
                    return parseListRSS(xml);
                }
            } catch (e) {
                console.warn(`[RSSHub] ❌ Failed ${bridge}: ${e.message}`);
                continue;
            }
        }

        // Attempt 2: Nitter Instances (Fallback)
        for (const instance of shuffledNitter) {
            try {
                const url = `${instance}/i/lists/${LIST_ID}/rss`;
                console.log(`[Nitter] 📡 Attempting fallback: ${instance}`);
                const xml = await stealthFetch(url);
                if (xml.includes('<item>')) {
                    console.log(`[Nitter] ✅ Success from ${instance}`);
                    return parseListRSS(xml);
                }
            } catch (e) {
                console.warn(`[Nitter] ❌ Failed ${instance}: ${e.message}`);
                continue;
            }
        }
        return null;
    };

    try {
        const [tgResults, twitterResults] = await Promise.all([
            Promise.all(tgHandles.map(h => fetchTelegram(h))),
            fetchTwitter()
        ]);

        let allTwitterItems = twitterResults || [];
        
        // Remove duplicates and sort
        const combined = [...tgResults.flat(), ...allTwitterItems];
        combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        const seen = new Set();
        listNewsCache = combined.filter(item => {
            const key = item.title.substring(0, 60) + (item.sourceHandle || 'news');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 150);
    } catch (err) {}
}

app.get('/api/news-v4-list', (req, res) => {
    res.json({ items: listNewsCache });
});

app.get('/api/news-diagnostics', (req, res) => {
    res.json({ sourceHealth: sourceHealth });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

setInterval(updateHybridCache, 30000); 
updateHybridCache();

app.listen(PORT, () => {
    console.log(`📡 V5 TURBO-HYBRID ENGINE ACTIVE ON PORT ${PORT}`);
});
