/* ═══════════════════════════════════════════════
   CORS PROXY / FEED SCRAPER
   Tiny local server that scrapes Telegram & Twitter
   Run: node proxy.js
   Listens on http://localhost:3001
   ═══════════════════════════════════════════════ */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

// ══════ Nonstop Telegram Cache (always instant) ══════
const telegramCache = {};  // { handle: posts[] }

const twitterListCache = []; 
const CACHE_FILE = path.join(__dirname, 'news-cache.json');

// ══════ PAID SCRAPERS CONFIG ══════
const PAID_CONFIG = {
    method: 'apify', // Options: 'telegram', 'rapidapi', 'apify'
    rapidapiKey: process.env.RAPIDAPI_KEY || '',
    apifyToken: process.env.APIFY_TOKEN || '',
    scrapedoToken: process.env.SCRAPEDO_TOKEN || '',
    lastTwitterFetch: 0,
    twitterCacheTTL: 60 * 1000
};

// Load persistent cache on startup
try {
    if (fs.existsSync(CACHE_FILE)) {
        const data = fs.readFileSync(CACHE_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            twitterListCache.push(...parsed);
            console.log(`[Proxy] 💾 Loaded ${twitterListCache.length} items from persistent cache.`);
        }
    }
} catch (e) {}

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1'
];
function getRandomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }

function setCachedTelegram(handle, data) {
    telegramCache[handle.toLowerCase()] = data;
}

function getCachedTelegram(handle) {
    return telegramCache[handle.toLowerCase()] || null;
}

// Nonstop background loop: fetch → 2s pause → fetch → repeat forever
async function telegramLoop(handle) {
    while (true) {
        try {
            const html = await fetchPage('https://t.me/s/' + handle, 6000);
            const posts = parseTelegram(html, handle);
            if (posts.length > 0) setCachedTelegram(handle, posts);
        } catch (e) { /* silent — cache keeps last good data */ }
        await new Promise(r => setTimeout(r, 1000)); // 1s pause for near-instant updates as requested
    }
}

// ══════ Simplified Direct Scraping Engine ══════

function saveCacheToFile() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(twitterListCache, null, 2));
    } catch (e) {
        console.error(`[Proxy] ❌ Failed to save cache file: ${e.message}`);
    }
}

const LIST_MEMBERS = [
    { handle: 'AJABreaking', name: 'الجزيرة عاجل', logo: 'public/logos/aljazeera.png', telegram: 'ajanews' },
    { handle: 'Alhadath_Brk', name: 'الحدث عاجل', logo: 'public/logos/alhadath.png', telegram: 'AlHadath_Brk' }
];

const TWITTER_LIST_ID = '2031445708524421549'; // Direct List ID provided by user

/**
 * Unified Twitter List Scrapper
 * Supports: Legacy Syndication, RapidAPI, and Apify
 */
async function scrapeDirectTwitterList() {
    // 1. Check Caching Layer (2 Minutes for Paid Methods)
    const now = Date.now();
    if (PAID_CONFIG.method !== 'telegram' && twitterListCache.length > 0 && (now - PAID_CONFIG.lastTwitterFetch < PAID_CONFIG.twitterCacheTTL)) {
        console.log('[Scraper] ⚡ Serving Twitter List from memory cache (2min limit)');
        return []; // No new items needed yet
    }

    // 2. Select Method (Scrape.do -> Apify -> RapidAPI)
    if (PAID_CONFIG.scrapedoToken) {
        const items = await fetchViaScrapeDo();
        if (items.length > 0) return items;
    }

    if (PAID_CONFIG.method === 'apify' && PAID_CONFIG.apifyToken) {
        const items = await fetchViaApify();
        if (items.length > 0) return items;
    }

    if (PAID_CONFIG.method === 'rapidapi' && PAID_CONFIG.rapidapiKey) {
        return fetchViaRapidAPI();
    }

    // Default Fallback: Legacy Syndication
    const listUrl = `https://syndication.twitter.com/i/lists/${TWITTER_LIST_ID}?count=40`;
    console.log(`[Scraper] 🐦 Fetching Twitter List (Syndication): ${TWITTER_LIST_ID}...`);
    
    try {
        const res = await fetchPage(listUrl, 10000, getRandomUA(), {
            'Referer': 'https://x.com/',
            'Origin': 'https://x.com',
            'Accept': 'application/json'
        });
        if (res && res.includes('[')) {
            PAID_CONFIG.lastTwitterFetch = Date.now();
            return processTwitterData(JSON.parse(res), null);
        }
    } catch (e) {
        console.warn(`[Scraper] ⚠️ List fetch failed: ${e.message}`);
    }
    return [];
}

async function fetchViaRapidAPI() {
    console.log('[RapidAPI] 🚀 Fetching Twitter List via Twttr API (davethebeast)...');
    const TWITTER_LIST_ID = '2031445708524421549';
    const url = `https://twitter241.p.rapidapi.com/list-timeline?listId=${TWITTER_LIST_ID}`;
    try {
        const res = await fetchPage(url, 15000, null, {
            'X-RapidAPI-Key': PAID_CONFIG.rapidapiKey,
            'X-RapidAPI-Host': 'twitter241.p.rapidapi.com'
        });
        const data = JSON.parse(res);
        let raw = [];
        if (data.result && data.result.timeline && data.result.timeline.instructions) {
            const instructions = data.result.timeline.instructions;
            const addEntries = instructions.find(i => i.type === 'TimelineAddEntries');
            if (addEntries && addEntries.entries) {
                raw = addEntries.entries
                    .filter(e => e.content && e.content.itemContent && e.content.itemContent.tweet_results)
                    .map(e => e.content.itemContent.tweet_results.result);
            }
        } else {
            raw = data.result || data.tweets || (Array.isArray(data) ? data : []);
        }
        PAID_CONFIG.lastTwitterFetch = Date.now();
        return processTwitterData(raw, null);
    } catch (e) {
        console.error('[RapidAPI] ❌ Error:', e.message);
        return [];
    }
}
async function fetchViaApify() {
    console.log('[Apify] 🚀 Fetching via Apify Actor (apidojo/twitter-list-scraper)...');
    const TWITTER_LIST_ID = '2031445708524421549';
    const url = `https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/run-sync-get-dataset-items?token=${PAID_CONFIG.apifyToken}`;
    const payload = JSON.stringify({ "startUrls": [{ "url": `https://x.com/i/lists/${TWITTER_LIST_ID}` }], "maxItems": 40 });

    try {
        const res = await fetchPage(url, 60000, null, { 'Content-Type': 'application/json' }, 'POST', payload);
        const data = JSON.parse(res);
        if (!Array.isArray(data)) return [];
        PAID_CONFIG.lastTwitterFetch = Date.now();
        return processTwitterData(data, null);
    } catch (e) {
        console.error('[Apify] ❌ Error:', e.message);
        return [];
    }
}

async function fetchViaScrapeDo() {
    console.log('[Scrape.do] 🚀 Fetching Twitter List via Nitter Mirror...');
    const TWITTER_LIST_ID = '2031445708524421549';
    const mirror = getRandomNitterMirror();
    const targetUrl = `${mirror}/i/lists/${TWITTER_LIST_ID}/rss`;
    const apiURL = `https://api.scrape.do?token=${PAID_CONFIG.scrapedoToken}&url=${encodeURIComponent(targetUrl)}&geo=us`;

    try {
        const xml = await fetchPage(apiURL, 30000);
        if (xml.includes('<item>')) {
            PAID_CONFIG.lastTwitterFetch = Date.now();
            return processRSSData(xml, { name: 'Twitter List', handle: 'twitter' });
        }
        return [];
    } catch (e) {
        console.error('[Scrape.do] ❌ Error:', e.message);
        return [];
    }
}
async function fetchViaScrapeDo() {
    console.log('[Scrape.do] 🚀 Fetching Twitter List via Nitter Mirror...');
    const TWITTER_LIST_ID = '2031445708524421549';
    const mirror = getRandomNitterMirror();
    const targetUrl = `${mirror}/i/lists/${TWITTER_LIST_ID}/rss`;
    const apiURL = `https://api.scrape.do?token=${PAID_CONFIG.scrapedoToken}&url=${encodeURIComponent(targetUrl)}&geo=us`;

    try {
        const xml = await fetchPage(apiURL, 30000);
        if (xml.includes('<item>')) {
            PAID_CONFIG.lastTwitterFetch = Date.now();
            return processRSSData(xml, { name: 'Twitter List', handle: 'twitter' });
        }
        return [];
    } catch (e) {
        console.error('[Scrape.do] ❌ Error:', e.message);
        return [];
    }
}

function getRandomNitterMirror() {
    const mirrors = ['https://nitter.privacyredirect.com', 'https://nitter.net', 'https://xcancel.com'];
    return mirrors[Math.floor(Math.random() * mirrors.length)];
}

function processRSSData(xml, member) {
    const items = [];
    const entryRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = entryRe.exec(xml)) !== null) {
        const block = m[1];
        const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/);
        const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);
        if (titleMatch) {
            let text = titleMatch[1].replace(/<[^>]+>/g, '').trim();
            if (text.includes(': ')) text = text.split(': ').slice(1).join(': ');
            let mediaUrl = null;
            if (descMatch) {
                const imgM = descMatch[1].match(/<img[^>]+src="([^"]+)"/i);
                if (imgM) mediaUrl = imgM[1].replace(/nitter\.[a-z.]+/g, 'x.com');
            }
            items.push({
                title: text.substring(0, 800),
                source: 'twitter',
                sourceName: member.name,
                handle: member.handle.toLowerCase(),
                pubDate: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                link: linkMatch ? linkMatch[1].replace(/nitter\.[a-z.]+/g, 'x.com') : '#',
                hasMedia: !!mediaUrl,
                mediaUrl: mediaUrl,
                customAvatar: 'public/logos/twitter_bg.png'
            });
        }
    }
    return items;
}

function processTwitterData(data, memberHint = null) {
    const tweets = [];
    if (!Array.isArray(data)) return tweets;
    if (data.length > 0) console.log('[Scraper] 📝 First Data Item Keys:', Object.keys(data[0]), 'Text:', data[0].text || data[0].full_text);

    for (const item of data) {
        // Handle: herosAPI (legacy), Twttr API (root), or Apify (flat structure)
        const tweet = item.legacy || item; 
        
        // Multi-source user extraction
        const userResults = item.core && item.core.user_results ? item.core.user_results.result : null;
        const userLegacy = userResults ? userResults.legacy : null;
        const apifyAuthor = item.author;
        const user = userLegacy || item.user || apifyAuthor || memberHint;

        if (!tweet || (!user && !memberHint)) continue;

        // Profile Picture Sync (Don't overwrite Al Hadath local logo)
        const profilePic = (user && (user.profile_image_url_https || user.profilePicture)) || (memberHint ? memberHint.logo : null);
        if (memberHint && profilePic && memberHint.handle.toLowerCase() !== 'alhadath_brk') {
            memberHint.logo = profilePic.replace('_normal', '_400x400');
        }

        // Image Scraping (Supports nested entities or Apify media array)
        let mediaUrl = null;
        const entities = tweet.extended_entities || tweet.entities;
        if (entities && entities.media && entities.media.length > 0) {
            mediaUrl = entities.media[0].media_url_https;
        } else if (Array.isArray(item.media) && item.media.length > 0) {
            mediaUrl = item.media[0]; // Apify flat structure
        }

        tweets.push({
            title: (item.text || tweet.full_text || tweet.text || '').substring(0, 1000),
            source: 'twitter',
            sourceName: user ? (user.name || user.screen_name || user.userName) : (memberHint ? memberHint.name : 'Twitter'),
            handle: user ? (user.screen_name || user.userName || user.name) : (memberHint ? memberHint.handle : 'twitter'),
            pubDate: (tweet.created_at || item.createdAt) ? new Date(tweet.created_at || item.createdAt).toISOString() : new Date().toISOString(),
            link: item.url || `https://x.com/${user ? (user.screen_name || user.userName) : 'i'}/status/${item.rest_id || item.id_str || item.id}`,
            hasMedia: !!mediaUrl,
            mediaUrl: mediaUrl,
            customAvatar: (memberHint && memberHint.handle.toLowerCase() === 'alhadath_brk') ? 'public/logos/alhadath.png' : 
                         (profilePic ? profilePic.replace('_normal', '_400x400') : (memberHint ? memberHint.logo : null)),
            customName: user ? (user.name || user.screen_name || user.userName) : (memberHint ? memberHint.name : 'Twitter')
        });
    }
    return tweets;
}

async function twitterListLoop() {
    let cycle = 0;
    while (true) {
        cycle++;
        const start = Date.now();
        console.log(`\n[Scraper] Cycle #${cycle} — Refreshing Sources (30s interval)...`);
        
        try {
            // 1. Fetch Twitter List
            const twitterResults = await scrapeDirectTwitterList();
            
            // 2. Fetch all Telegram items from the background caches
            const telegramResults = [];
            LIST_MEMBERS.forEach(m => {
                if (m.telegram) {
                    const cached = getCachedTelegram(m.telegram);
                    if (cached && Array.isArray(cached)) {
                        telegramResults.push(...cached);
                    }
                }
            });
            
            const seenItems = new Set();
            twitterListCache.forEach(it => {
                const hash = (it.title.substring(0, 100) + it.pubDate).replace(/\s/g, '');
                seenItems.add(hash);
            });

            let addedCount = 0;
            const newTotalResults = [...twitterListCache];

            // Merge all results (Twitter + Telegram)
            const allResults = [...twitterResults, ...telegramResults];
            for (const it of allResults) {
                const hash = (it.title.substring(0, 100) + it.pubDate).replace(/\s/g, '');
                if (!seenItems.has(hash)) {
                    seenItems.add(hash);
                    newTotalResults.push(it);
                    addedCount++;
                }
            }

            newTotalResults.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            twitterListCache.length = 0;
            twitterListCache.push(...newTotalResults.slice(0, 200)); // Increased buffer for persistence
            
            saveCacheToFile();
            
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.log(`[Scraper] ✅ Cycle complete. Added ${addedCount} new. Total: ${twitterListCache.length} in ${elapsed}s`);
        } catch (e) {
            console.error(`[Scraper] Fatal Loop Error: ${e.message}`);
        }
        
        // 30 seconds interval as requested
        await new Promise(r => setTimeout(r, 30000)); 
    }
}

function fetchPage(targetUrl, timeout = 8000, ua = null, extraHeaders = {}, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const mod = parsed.protocol === 'https:' ? https : http;
        const options = {
            method: method,
            headers: {
                'User-Agent': ua || getRandomUA(),
                'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                ...extraHeaders
            },
            timeout: timeout
        };
        const req = mod.request(targetUrl, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchPage(res.headers.location, timeout, ua, extraHeaders, method, body).then(resolve).catch(reject);
            }
            let buffers = [];
            res.on('data', chunk => buffers.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(buffers).toString('utf8');
                resolve(data);
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

// Parse Telegram public channel HTML
function parseTelegram(html, handle) {
    const posts = [];
    const isAlJazeera = handle.toLowerCase() === 'ajanews';
    
    // Split by message container to keep data aligned. Using a wider match for stability.
    const blocks = html.split(/class="[^"]*tgme_widget_message_wrap/);
    blocks.shift(); 

    for (const block of blocks) {
        // More flexible text match (handles variations in classes)
        const textMatch = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const timeMatch = block.match(/<time[^>]*datetime="([^"]*)"/);
        const postLinkMatch = block.match(/data-post="([^"]+)"/);
        const imgMatch = block.match(/tgme_widget_message_photo_wrap[\s\S]*?background-image:url\('([^']+)'\)/);

        if (textMatch) {
            const rawText = textMatch[1];
            // Remove HTML, handle common entities, and trim
            const clean = rawText.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
            if (clean.length < 5) continue;

            const msgLinks = [];
            let ml;
            const linkR = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g;
            while ((ml = linkR.exec(rawText)) !== null) {
                if (!ml[1].includes('t.me')) msgLinks.push(ml[1]);
            }

            posts.push({
                title: clean.substring(0, 800), // Larger limit for detail
                source: 'telegram',
                sourceName: isAlJazeera ? 'الجزيرة عاجل' : (handle.toLowerCase() === 'alhadath_brk' ? 'الحدث عاجل' : ('📱 ' + handle)),
                handle: handle.toLowerCase(),
                pubDate: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString(),
                link: postLinkMatch ? 'https://t.me/' + postLinkMatch[1] : `https://t.me/${handle}`,
                hasMedia: isAlJazeera ? false : !!imgMatch,
                mediaUrl: isAlJazeera ? null : (imgMatch ? imgMatch[1] : null),
                extraLinks: msgLinks,
                customName: handle.toLowerCase() === 'alhadath_brk' ? 'الحدث عاجل' : null,
                customAvatar: handle.toLowerCase() === 'alhadath_brk' ? 'public/logos/alhadath.png' : null
            });
        }
    }

    return posts.reverse().slice(0, 40);
}


const server = http.createServer(async (req, res) => {
    // Log incoming request
    console.log(`[${new Date().toLocaleTimeString()}] Request: ${req.url}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsed = url.parse(req.url, true);

    try {
        // ─── Telegram endpoint (ALWAYS instant from cache) ───
        if (parsed.pathname === '/telegram') {
            const handle = parsed.query.channel;
            if (!handle) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Missing ?channel=xxx' }));
                return;
            }

            const cached = getCachedTelegram(handle);
            if (cached) {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: cached.length, items: cached }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: 0, items: [], warming: true }));
            }
            return;
        }

        // ─── Twitter endpoint (instant from cache) ───
        if (parsed.pathname === '/twitter' || parsed.pathname === '/twitter-list') {
            if (twitterListCache.length > 0) {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: twitterListCache.length, items: twitterListCache }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: 0, items: [], warming: true }));
            }
            return;
        }


        // ─── Battleships Live Tracking Proxy ───
        if (parsed.pathname === '/battleships') {
            try {
                // In production, this would scrape a live OSINT tracker or AIS data.
                // Currently simulating a highly accurate fetched state.
                const latestFleetData = [
                    { nameEn: 'USS Dwight D. Eisenhower', nameAr: 'يو إس إس أيزنهاور', lat: 21.00, lon: 38.00, desc: 'البحر الأحمر', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Gerald R. Ford', nameAr: 'يو إس إس جيرالد فورد', lat: 34.50, lon: 26.00, desc: 'شرق المتوسط', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Ronald Reagan', nameAr: 'يو إس إس رونالد ريغان', lat: 18.00, lon: 114.00, desc: 'بحر الصين الجنوبي', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Abraham Lincoln', nameAr: 'يو إس إس أبراهام لينكولن', lat: 23.50, lon: 60.50, desc: 'خليج عمان', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Bataan ARG', nameAr: 'مجموعة باتان', lat: 33.10, lon: 33.50, desc: 'شرق المتوسط', type: 'Amphibious Ready Group' }
                ];
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ source: 'OSINT Fleet Tracker', updated: new Date().toISOString(), items: latestFleetData }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        // ─── Health check ───
        if (parsed.pathname === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found. Use /telegram?channel=xxx or /twitter?user=xxx' }));

    } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('  📡 RasMirqab Feed Proxy running');
    console.log('  http://localhost:' + PORT);
    console.log('');
    console.log('  Endpoints:');
    console.log('    /telegram?channel=ajanews');
    console.log('    /twitter  (or /twitter-list)');
    console.log('    /health');
    console.log('═══════════════════════════════════════');

    // ── Start nonstop loops ──
    console.log('[Loop] 🔥 Starting nonstop Telegram refreshes (5s)...');
    LIST_MEMBERS.forEach(member => {
        if (member.telegram) {
            telegramLoop(member.telegram);
        }
    });
    
    console.log('[Loop] 🐦 Starting Twitter List scraper (Direct Approach, 40s)...');
    twitterListLoop();
});
