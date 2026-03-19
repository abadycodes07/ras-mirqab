/* ═══════════════════════════════════════════════
   V9 ULTIMATE ENGINE (SOLID-STEALTH)
   ═══════════════════════════════════════════════ */

const express = require('express');
const { execSync } = require('child_process');
const https   = require('https');
const http    = require('http');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const LIST_ID = "2031445708524421549";
const TELEGRAM_INTERVAL = 7000; 
const TWITTER_INTERVAL = 60000;
const SENTINEL_TOKEN = "RAS_SENTINEL_777";

const RSSHUB_BRIDGES = [
    'https://rsshub.rssforever.com',
    'https://rsshub.moeyy.cn',
    'https://rss.owo.nz',
    'https://rsshub.app',
    'https://rss.artpro.io'
];

const BROWSER_FINGERPRINTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
];

const AVATAR_MAP = {
    'AsharqNewsBrk': 'public/logos/asharq2.jpg',
    'AlHadath': 'public/logos/hadath.png',
    'AlArabiya_Brk': 'public/logos/alarabiya.png',
    'SkyNewsArabia_B': 'public/logos/skynews.png',
    'RT_Arabic': 'public/logos/rt.png',
    'RTonline_ar': 'public/logos/rt.png',
    'alrougui': 'public/logos/alrougui.jpg',
    'ajmubasher': 'public/logos/ajmubasher.png',
    'alekhbariyaNews': 'public/logos/alekhbariyanews.jpg',
    'alekhbariyaBRK': 'public/logos/alekhbariyabrk.jpg',
    'modgovksa': 'public/logos/modgovksa2.png',
    'NewsNow4USA': 'public/logos/newsnow.jpg',
    'AJELNEWS2475': 'public/logos/ajelnews.jpg',
    'ajanews': 'public/logos/aljazeera.png',
    'alhadath_brk': 'public/logos/hadath.png',
    'AlArabiya': 'public/logos/arabiya.png',
    'asharqnewsbrk': 'public/logos/asharq.png',
    'alekhbariyanews': 'public/logos/ekhbariya.png',
    'rt_arabic': 'public/logos/rt.png'
};

// Global State
let proxyPool = [];
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'news_cache_v9.json');
let telegramCache = [];
let twitterCache = [];

// Load persisted cache on startup
try {
    if (fs.existsSync(CACHE_FILE)) {
        const saved = JSON.parse(fs.readFileSync(CACHE_FILE));
        telegramCache = saved.telegram || [];
        twitterCache = saved.twitter || [];
        console.log(`💾 [V9] Loaded persisted cache: TG(${telegramCache.length}), TW(${twitterCache.length})`);
    }
} catch(e) { console.log("❌ Cache load error:", e.message); }

function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ telegram: telegramCache, twitter: twitterCache }));
    } catch(e) {}
}

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Serve public directory for icons/logos
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

async function refreshProxyPool() {
    try {
        const res = execSync('curl -s "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all"').toString();
        const fresh = res.split('\n').map(p => p.trim()).filter(p => p && p.includes(':'));
        if (fresh.length > 5) proxyPool = fresh;
    } catch (e) {}
}

function stealthFetch(url, useProxy = true) {
    const ua = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];
    const proxy = (useProxy && proxyPool.length > 0) ? proxyPool[Math.floor(Math.random() * proxyPool.length)] : null;
    
    try {
        const proxyCmd = proxy ? `-x http://${proxy}` : '';
        const cmd = `curl -L ${proxyCmd} -H "User-Agent: ${ua}" --connect-timeout 8 --max-time 15 "${url}"`;
        let res = execSync(cmd).toString();
        
        // V11: Detect Rate Limit and Retry with Proxy automatically
        if (res.includes('Rate limit exceeded') && !proxy) {
            console.log(`⚠️ Rate limit hit on direct fetch. Retrying with proxy...`);
            return stealthFetch(url, true);
        }

        if (!useProxy) console.log(`📡 [DirectFetch] ${url.substring(0,60)}... | Length: ${res.length}`);
        return res;
    } catch (e) {
        if (!useProxy) console.log(`❌ [DirectFetch] Error fetching ${url.substring(0,40)}: ${e.message}`);
        return '';
    }
}

// Helper for Cumulative Merging
function mergeCache(existing, fresh, limit = 120) {
    const combined = [...fresh, ...existing];
    const seen = new Set();
    return combined.filter(item => {
        const key = ((item.title || '') + (item.sourceHandle || '')).toLowerCase().substring(0, 150);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, limit);
}


// ═══════════════════════════════════════════
// TURBO TELEGRAM — Pure async Node.js https,
// zero child process overhead, keep-alive pool,
// all channels fetched truly in parallel.
// ═══════════════════════════════════════════

// Connection pool: keep-alive agent reuses TCP connections to t.me
const TG_AGENT = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 20,           // up to 20 simultaneous connections
    maxFreeSockets: 10,
    timeout: 10000,
});

const TG_CHANNELS = [
    // Al Jazeera Arabic
    'ajanews',
    // Al Hadath Breaking
    'alhadath_brk',
    // Al Arabiya
    'alarabiyabrk',
    // Asharq News Breaking
    'asharqnewsbrk',
    // Al Ekhbariya News
    'alekhbariyanews',
    // RT Arabic
    'rt_arabic',
    // Sky News Arabia Breaking
    'skynewsarabia_breaking',
    // Saudi Ministry of Defense
    'modgovksa',
    // Al Rougui
    'alrougui',
];

/**
 * Fetch a Telegram public channel page using pure Node.js https.
 * Returns the HTML string. Resolves in typically 200-600ms.
 */
function fetchTelegramFast(handle) {
    return new Promise((resolve) => {
        const url = `https://t.me/s/${handle}`;
        const req = https.get(url, {
            agent: TG_AGENT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ar,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
            },
        }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                resolve(''); return;
            }
            const chunks = [];
            const decompress = (() => {
                const enc = res.headers['content-encoding'];
                if (enc === 'gzip')    return require('zlib').createGunzip();
                if (enc === 'deflate') return require('zlib').createInflate();
                if (enc === 'br')      return require('zlib').createBrotliDecompress();
                return null;
            })();
            const stream = decompress ? res.pipe(decompress) : res;
            stream.on('data', c => chunks.push(c));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            stream.on('error', () => resolve(''));
        });
        req.setTimeout(8000, () => { req.destroy(); resolve(''); });
        req.on('error', () => resolve(''));
    });
}

/**
 * Parse Telegram HTML into news items.
 * Extracts: text, datetime, media image, message link.
 */
function parseTelegramHtml(html, handle) {
    if (!html || html.length < 200) return [];
    const items = [];
    const blocks = html.split('<div class="tgme_widget_message_wrap');
    blocks.shift(); // drop content before first message

    for (const block of blocks) {
        // Text
        const textM = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        // Datetime
        const timeM = block.match(/<time[^>]*datetime="([^"]*)"/);
        if (!textM || !timeM) continue;

        const rawText = textM[1]
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
            .replace(/\s{2,}/g, ' ').trim();

        if (!rawText || rawText.length < 8) continue;

        // Media image (photo)
        const imgM  = block.match(/style="background-image:url\('([^']+)'\)"/);
        const imgM2 = block.match(/<img[^>]+src="(https:\/\/cdn[^"]+)"/);
        const media = imgM?.[1] || imgM2?.[1] || null;

        // Message permalink
        const linkM = block.match(/href="(https:\/\/t\.me\/[^"]+)"[^>]*class="[^"]*tgme_widget_message_date/);
        const link  = linkM?.[1] || `https://t.me/s/${handle}`;

        items.push({
            title:        rawText,
            source:       'telegram',
            sourceHandle: handle,
            sourceName:   handle,
            pubDate:      new Date(timeM[1]).toISOString(),
            link,
            mediaUrl:     media,
            customAvatar: AVATAR_MAP[handle] || AVATAR_MAP[handle.toLowerCase()] || 'public/logos/default.png',
        });
    }
    return items;
}

async function updateTelegram() {
    const t0 = Date.now();

    // TRUE parallel: all channels fetched simultaneously, no blocking
    const results = await Promise.all(
        TG_CHANNELS.map(async handle => {
            try {
                const html  = await fetchTelegramFast(handle);
                const items = parseTelegramHtml(html, handle);
                if (items.length) console.log(`  ✅ TG ${handle}: ${items.length} items`);
                return items;
            } catch(e) {
                console.log(`  ❌ TG ${handle}: ${e.message}`);
                return [];
            }
        })
    );

    const localItems = results.flat();
    const ms = Date.now() - t0;

    if (localItems.length > 0) {
        telegramCache = mergeCache(telegramCache, localItems, 120);
        saveCache();
        console.log(`⚡ TURBO TELEGRAM: ${localItems.length} items from ${TG_CHANNELS.length} channels in ${ms}ms`);
    } else {
        console.log(`⚠️ TG: No items (${ms}ms)`);
    }
}



async function updateTwitter() {
    console.log('📡 [V10] Twitter Hyper-Resilient Cycle...');
    let localItems = [];

    // Protocol 1: Hybrid Syndication (Direct + Proxy)
    // Key members from the list
    const directHandles = ['AlHadath', 'SkyNewsArabia_B', 'AlArabiya_Brk', 'AsharqNewsBrk', 'AJELNEWS2475'];
    const proxyHandles = ['alekhbariyaNews', 'alekhbariyaBRK', 'RTonline_ar', 'alrougui', 'ajmubasher', 'modgovksa', 'NewsNow4USA'];
    
    // 1a. Fast Direct Fetch (No Proxy) - 100% Reliability for key channels
    for (const h of directHandles) {
        try {
            const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${h}`, false);
            const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (match) {
                const data = JSON.parse(match[1]);
                const tweets = data.props.pageProps.timeline.entries.map(e => {
                    const t = e.content.tweet;
                    if (!t) return null;
                    return {
                        title: t.full_text,
                        link: `https://x.com/${h}/status/${t.id_str}`,
                        pubDate: new Date(t.created_at).toISOString(),
                        source: 'twitter', sourceHandle: h, sourceName: h,
                        image: t.entities?.media?.[0]?.media_url_https || null,
                        customAvatar: AVATAR_MAP[h] || 'public/logos/default.png'
                    };
                }).filter(Boolean);
                if (tweets.length > 0) {
                    localItems = [...localItems, ...tweets];
                    console.log(`📡 [V10] P1a (Direct) ${h}: ${tweets.length} items`);
                }
            }
        } catch (e) {}
    }

    // 1b. Parallel Proxy Fetch (Supporting handles)
    try {
        const syncResults = await Promise.all(proxyHandles.map(async h => {
            try {
                const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${h}`, true);
                const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
                if (!match) return [];
                const data = JSON.parse(match[1]);
                return data.props.pageProps.timeline.entries.map(e => {
                    const t = e.content.tweet;
                    if (!t) return null;
                    return {
                        title: t.full_text,
                        link: `https://x.com/${h}/status/${t.id_str}`,
                        pubDate: new Date(t.created_at).toISOString(),
                        source: 'twitter', sourceHandle: h, sourceName: h,
                        image: t.entities?.media?.[0]?.media_url_https || null,
                        customAvatar: AVATAR_MAP[h] || 'public/logos/default.png'
                    };
                }).filter(Boolean);
            } catch (e) { return []; }
        }));
        const p1b = syncResults.flat();
        if (p1b.length > 0) {
            localItems = [...localItems, ...p1b];
            console.log(`📡 [V10] P1b (Proxy) found ${p1b.length} items`);
        }
    } catch (e) {}

    // Protocol 2: V13 DIY Master Bridge (The "Iron" Layer)
    try {
        const bridgeUrl = "https://script.google.com/macros/s/AKfycbwR3buIurRZhlwWM5ieYo8gZZHxoKMxx2tVcegnOIumq0a0aGlkdbnqlsm_saad9550/exec";
        const responseData = stealthFetch(bridgeUrl, false); 
        if (responseData) {
            const data = JSON.parse(responseData);
            if (data.status === "success" && data.items && data.items.length > 0) {
                console.log(`📡 [V13] Master Bridge found ${data.items.length} items via ${data.source}`);
                localItems = [...localItems, ...data.items.map(item => ({
                    ...item,
                    customAvatar: AVATAR_MAP[item.sourceHandle] || 'public/logos/default.png'
                }))];
            }
        }
    } catch(e) {
        console.log("⚠️ [V13] Master Bridge Fetch Failed:", e.message);
    }

    // Protocol 3: V12 Recursive Mirror Failover (The "Swarm")
    if (localItems.length < 10) {
        console.log("📡 [V12] Low item count. Engaging Swarm Failover...");
        const swarmMirrors = [
            `https://rsshub.app/twitter/list/${LIST_ID}`,
            `https://rsshub.rssforever.com/twitter/list/${LIST_ID}`,
            `https://rss.owo.nz/twitter/list/${LIST_ID}`,
            `https://nitter.net/i/lists/${LIST_ID}/rss`,
            `https://nitter.privacydev.net/i/lists/${LIST_ID}/rss`,
            `https://nitter.dafrary.com/i/lists/${LIST_ID}/rss`
        ];

        for (const url of swarmMirrors) {
            try {
                const xml = stealthFetch(url, true);
                if (xml && xml.length > 500 && !xml.includes("Rate limit")) {
                    const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
                    if (matches.length > 0) {
                        console.log(`✅ [V12] Swarm Success via ${url.substring(0,30)}... (${matches.length} items)`);
                        for (const m of matches) {
                            const c = m[1];
                            const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
                            const l = c.match(/<link>([\s\S]*?)<\/link>/);
                            const d = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
                            if (t && l) {
                                localItems.push({
                                    title: t[1].replace(/<[^>]+>/g, '').trim(),
                                    link: l[1].replace('nitter.net', 'x.com'),
                                    pubDate: d ? new Date(d[1]).toISOString() : new Date().toISOString(),
                                    source: 'twitter', sourceHandle: 'List', sourceName: 'Twitter List',
                                    customAvatar: 'public/logos/default.png'
                                });
                            }
                        }
                        break; // Stop swarm if successful
                    }
                }
            } catch (e) {}
        }
    }

    if (localItems.length > 0) {
        // V12: Persistent Cumulative Guard (Max 300 items)
        twitterCache = mergeCache(twitterCache, localItems, 300);
        saveCache();
        console.log(`✅ [V12] Twitter Sync Stable: ${twitterCache.length} items in cache.`);
    } else {
        console.log("⚠️ [V12] Full Cycle Failed. Retaining previous cache.");
    }
}

// ═══════════════════════════════════════════
// TWITTER — Active scraper using TwitterAPI.io
// ═══════════════════════════════════════════
const TWITTER_API_KEY = 'new1_9a59c3ffc7e04c0bb5032b97c2d06ef5';
const LIST_ID_TW = '2031445708524421549';

async function fetchTwitterAPI() {
    try {
        return await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.twitterapi.io',
                path: `/twitter/list/tweets_timeline?listId=${LIST_ID_TW}`,
                method: 'GET',
                headers: { 'X-API-Key': TWITTER_API_KEY }
            };
            const req = https.request(options, res => {
                let data = '';
                res.on('data', d => data += d);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch(e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.setTimeout(10000, () => req.destroy());
            req.end();
        });
    } catch(e) {
        console.log('❌ TwitterAPI.io failed:', e.message);
        return null;
    }
}

async function updateTwitterActive() {
    console.log('📡 [Active] Twitter cycle start...');
    let localItems = [];

    // Layer 1: TwitterAPI.io (paid key)
    try {
        const data = await fetchTwitterAPI();
        if (data && data.tweets && data.tweets.length > 0) {
            localItems = data.tweets.map(tw => {
                const media = tw.extended_entities?.media?.[0]?.media_url_https
                           || tw.entities?.media?.[0]?.media_url_https || null;
                const handle = tw.author?.userName || 'twitter';
                return {
                    title: (tw.text || tw.full_text || '').replace(/https?:\/\/\S+/g, '').trim(),
                    link: `https://x.com/${handle}/status/${tw.id || tw.id_str}`,
                    pubDate: new Date(tw.created_at || tw.createdAt).toISOString(),
                    source: 'twitter', sourceHandle: handle, sourceName: handle,
                    mediaUrl: media || null,
                    customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                };
            }).filter(t => t.title && t.title.length > 5);
            console.log(`✅ [TwitterAPI.io] ${localItems.length} tweets fetched`);
        }
    } catch(e) {}

    // Layer 2: Nitter RSS mirrors (if API fails or low count)
    if (localItems.length < 5) {
        const nitterMirrors = [
            `https://nitter.privacydev.net/i/lists/${LIST_ID_TW}/rss`,
            `https://nitter.dafrary.com/i/lists/${LIST_ID_TW}/rss`,
            `https://nitter.it/i/lists/${LIST_ID_TW}/rss`,
        ];
        for (const url of nitterMirrors) {
            try {
                const xml = stealthFetch(url, false);
                if (xml && xml.length > 500 && xml.includes('<item>')) {
                    const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
                    if (matches.length > 0) {
                        for (const m of matches) {
                            const c = m[1];
                            const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
                            const l = c.match(/<link>([\s\S]*?)<\/link>/);
                            const d = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
                            const auth = c.match(/<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/);
                            if (t && t[1].trim().length > 5) {
                                localItems.push({
                                    title: t[1].replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim(),
                                    link: (l?.[1] || '').replace('nitter.privacydev.net','x.com').replace('nitter.dafrary.com','x.com').replace('nitter.it','x.com'),
                                    pubDate: d ? new Date(d[1]).toISOString() : new Date().toISOString(),
                                    source: 'twitter', sourceHandle: auth?.[1] || 'List', sourceName: auth?.[1] || 'Twitter List',
                                    customAvatar: 'public/logos/default.png'
                                });
                            }
                        }
                        console.log(`✅ [Nitter] ${matches.length} tweets from ${url}`);
                        break;
                    }
                }
            } catch(e) {}
        }
    }

    // Layer 3: RSSHub (last resort)
    if (localItems.length < 5) {
        const rssHubs = [
            `https://rsshub.app/twitter/list/${LIST_ID_TW}`,
            `https://rsshub.rssforever.com/twitter/list/${LIST_ID_TW}`,
        ];
        for (const url of rssHubs) {
            try {
                const xml = stealthFetch(url, false);
                if (xml && xml.length > 500 && xml.includes('<item>')) {
                    const matches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
                    for (const m of matches) {
                        const c = m[1];
                        const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
                        const l = c.match(/<link>([\s\S]*?)<\/link>/);
                        const d = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
                        if (t && t[1].trim().length > 5) {
                            localItems.push({
                                title: t[1].replace(/<[^>]+>/g,'&').replace(/&amp;/g,'&').trim(),
                                link: l?.[1] || '#',
                                pubDate: d ? new Date(d[1]).toISOString() : new Date().toISOString(),
                                source: 'twitter', sourceHandle: 'List', sourceName: 'Twitter List',
                                customAvatar: 'public/logos/default.png'
                            });
                        }
                    }
                    if (matches.length > 0) { console.log(`✅ [RSSHub] ${matches.length} from ${url}`); break; }
                }
            } catch(e) {}
        }
    }

    if (localItems.length > 0) {
        twitterCache = mergeCache(twitterCache, localItems, 300);
        saveCache();
        writeNewsJson(); // push to public/news.json
        console.log(`✅ Twitter cache: ${twitterCache.length} total`);
    }
}

// Write combined cache to public/news.json for frontend consumption
function writeNewsJson() {
    try {
        const combined = [...telegramCache, ...twitterCache]
            .sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 200);
        const jsonPath = path.join(__dirname, 'public', 'news.json');
        fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2));
        console.log(`💾 news.json updated: ${combined.length} items`);
    } catch(e) { console.log('❌ news.json write error:', e.message); }
}

async function startScrapers() {
    console.log("🚀 [V17.3] ACTIVE SCRAPING MODE: Telegram 10s + Twitter 60s");
    
    // Immediate first run
    await updateTelegram();
    writeNewsJson();
    await updateTwitterActive();

    // Telegram every 5 seconds (turbo async fetch is fast enough)
    setInterval(async () => {
        await updateTelegram();
        writeNewsJson();
    }, 5000);

    // Twitter every 60 seconds
    setInterval(async () => {
        await updateTwitterActive();
    }, 60000);
}

app.get('/api/news/telegram', (req, res) => res.json({ items: telegramCache }));
app.get('/api/news/twitter', (req, res) => res.json({ items: twitterCache }));
app.get('/api/news-v4-list', (req, res) => {
    // Zero-Lag: Serve directly from RAM cache
    const combined = [...telegramCache, ...twitterCache].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.json({ items: combined });
});

// ═══════════════════════════════════════════════
// V17 SENTINEL SYNC (LOCAL-TO-CLOUD)
// ═══════════════════════════════════════════════
app.use(express.json({ limit: '5mb' }));

// SENTINEL_TOKEN already defined at line 14

app.post('/api/v17/sync-push', (req, res) => {
    const { token, telegram, twitter } = req.body;

    if (token !== SENTINEL_TOKEN) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    if (telegram) {
        telegramCache = mergeCache(telegramCache, telegram, 150);
        console.log(`📡 [Sentinel] Injected ${telegram.length} Telegram items.`);
    }

    if (twitter) {
        twitterCache = mergeCache(twitterCache, twitter, 300);
        console.log(`📡 [Sentinel] Injected ${twitter.length} Twitter items.`);
    }

    saveCache();
    res.json({ status: "success", syncedAt: new Date().toISOString() });
});

app.get('/ping', (req, res) => res.send('pong'));
app.get('/health', (req, res) => res.json({ status: "ok", mode: "sentinel-sync" }));

// Boot
startScrapers().catch(console.error);
setInterval(refreshProxyPool, 600000);

app.listen(PORT, () => console.log(`🚀 V14 ENGINE LIVE - Priority Telegram Active`));
