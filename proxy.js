/* ═══════════════════════════════════════════════
   V9 ULTIMATE ENGINE (SOLID-STEALTH)
   ═══════════════════════════════════════════════ */

const express = require('express');
const { execSync } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const LIST_ID = "2031445708524421549";
const TELEGRAM_INTERVAL = 7000; 
const TWITTER_INTERVAL = 60000; // 1 Minute Goal

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
    'AlHadath': 'public/logos/alhadath3.png',
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

async function updateTelegram() {
    const handles = ['ajanews', 'alhadath_brk', 'AlArabiya', 'asharqnewsbrk', 'alekhbariyanews', 'rt_arabic'];
    let localItems = [];
    
    for (const h of handles) {
        try {
            const html = stealthFetch(`https://t.me/s/${h}`, false); 
            const chunks = html.split('<div class="tgme_widget_message_wrap');
            chunks.shift();
            for (const msgHtml of chunks) {
                const textM = msgHtml.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
                const timeM = msgHtml.match(/<time[^>]*datetime="([^"]*)"/);
                if (textM && timeM) {
                    localItems.push({
                        title: textM[1].replace(/<[^>]+>/g, '').trim(),
                        source: 'telegram', sourceHandle: h, sourceName: h,
                        pubDate: new Date(timeM[1]).toISOString(),
                        link: `https://t.me/s/${h}`,
                        customAvatar: AVATAR_MAP[h] || 'public/logos/default.png'
                    });
                }
            }
        } catch (e) {}
    }
    if (localItems.length > 0) {
        telegramCache = mergeCache(telegramCache, localItems, 60);
        saveCache();
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

    // Protocol 2: Solid Google Bridge (The "Iron" Layer)
    try {
        const bridgeUrl = "https://script.google.com/macros/s/AKfycbxzAUaL4x1dVU05FqVX9Gs7JjkJMbqX6pHRLXdzdG2sX79FQVECLsXqyzEvS6E6I75KeQ/exec";
        const xml = stealthFetch(bridgeUrl, false); 
        const rssMatch = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        if (rssMatch.length > 0) {
            console.log(`📡 [V10] P2 (Google Bridge) found ${rssMatch.length} items`);
            for (const m of rssMatch) {
                const c = m[1];
                const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
                const h = c.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
                const d = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
                if (t) {
                    const handle = h ? h[1] : 'News';
                    localItems.push({
                        title: t[1].replace(/<[^>]+>/g, '').trim(),
                        link: 'https://x.com/i/lists/' + LIST_ID,
                        pubDate: d ? new Date(d[1]).toISOString() : new Date().toISOString(),
                        source: 'twitter', sourceHandle: handle, sourceName: handle,
                        customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                    });
                }
            }
        }
    } catch(e) {}

    // Protocol 3: Nitter RSS Direct Fallback (Emergency Mirroring)
    if (localItems.length < 5) {
        const nitterMirrors = ['https://nitter.net', 'https://nitter.privacydev.net', 'https://nitter.dafrary.com'];
        for (const mirror of nitterMirrors) {
            try {
                const xml = stealthFetch(`${mirror}/i/lists/${LIST_ID}/rss`, false);
                const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
                if (items.length > 0) {
                    console.log(`📡 [V10] P3 (Nitter Direct) found ${items.length} items via ${mirror}`);
                    for (const m of items) {
                        const c = m[1];
                        const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
                        const d = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
                        const l = c.match(/<link>([\s\S]*?)<\/link>/);
                        if (t) {
                            localItems.push({
                                title: t[1].replace(/<[^>]+>/g, '').trim(),
                                link: l ? l[1] : `https://x.com/i/lists/${LIST_ID}`,
                                pubDate: d ? new Date(d[1]).toISOString() : new Date().toISOString(),
                                source: 'twitter', sourceHandle: 'News', sourceName: 'News',
                                customAvatar: 'public/logos/default.png'
                            });
                        }
                    }
                    if (localItems.length > 5) break;
                }
            } catch (e) {}
        }
    }

    if (localItems.length > 0) {
        twitterCache = mergeCache(twitterCache, localItems, 120);
        saveCache();
        console.log(`✅ [V10] Twitter Stable: ${twitterCache.length}`);
    }
}

app.get('/api/news/telegram', (req, res) => res.json({ items: telegramCache }));
app.get('/api/news/twitter', (req, res) => res.json({ items: twitterCache }));
app.get('/api/news-v4-list', (req, res) => res.json({ items: [...telegramCache, ...twitterCache].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)) }));
app.get('/ping', (req, res) => res.send('pong'));

// Boot
setInterval(updateTelegram, TELEGRAM_INTERVAL);
setInterval(updateTwitter, TWITTER_INTERVAL);
setInterval(refreshProxyPool, 600000);

refreshProxyPool().then(() => {
    updateTelegram();
    updateTwitter();
    app.listen(PORT, () => console.log(`🚀 V9 ENGINE LIVE`));
});
