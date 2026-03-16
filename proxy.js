/* ═══════════════════════════════════════════════
   V8.1 RESILIENT ENGINE (BUGFIX: TELEGRAM CONSISTENCY)
   ═══════════════════════════════════════════════ */

const express = require('express');
const { execSync } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const LIST_ID = "2031445708524421549";
const TELEGRAM_INTERVAL = 15000; 
const TWITTER_INTERVAL = 120000; 

const RSSHUB_BRIDGES = [
    'https://rsshub.rssforever.com',
    'https://rsshub.moeyy.cn',
    'https://rss.shab.fun',
    'https://rss.owo.nz'
];

const BROWSER_FINGERPRINTS = [
    { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' },
    { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept-Language': 'en-GB,en;q=0.8' },
    { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
];

const AVATAR_MAP = {
    'AsharqNewsBrk': 'public/logos/asharq2.jpg',
    'AlHadath': 'public/logos/alhadath3.png',
    'alrougui': 'public/logos/alrougui.jpg',
    'alekhbariyabrk': 'public/logos/alekhbariya.jpg',
    'SkyNewsArabia_B': 'public/logos/skynews.png',
    'RT_Arabic': 'public/logos/rt.png',
    'ajanews': 'public/logos/ajanews_new.png',
    'alhadath_brk': 'public/logos/alhadath3.png',
    'AlArabiya': 'public/logos/alarabiya.png'
};

// Global State
let proxyPool = [];
let telegramCache = [];
let twitterCache = [];

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

async function refreshProxyPool() {
    try {
        const res = execSync('curl -s "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all"').toString();
        const fresh = res.split('\n').map(p => p.trim()).filter(p => p && p.includes(':'));
        if (fresh.length > 5) proxyPool = fresh;
    } catch (e) {}
}

function directFetch(url) {
    const fingerprint = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];
    const hCmd = Object.entries(fingerprint).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
    // Use --compressed to handle GZIP/Deflate which can sometimes fix encoding issues
    return execSync(`curl -L ${hCmd} --compressed --connect-timeout 8 --max-time 15 "${url}"`).toString();
}

function stealthFetch(url, customHeaders = {}, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        const fingerprint = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];
        const proxy = proxyPool.length > 0 ? proxyPool[Math.floor(Math.random() * proxyPool.length)] : null;
        try {
            const proxyCmd = proxy ? `-x http://${proxy}` : '';
            const headers = { ...fingerprint, ...customHeaders };
            const hCmd = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
            const result = execSync(`curl -L ${proxyCmd} ${hCmd} --compressed --connect-timeout 8 --max-time 15 "${url}"`).toString();
            if (result.length > 100) return result;
        } catch (e) {}
    }
    return directFetch(url); 
}

// Telegram Flow: Robust V8.1 Scraper
async function updateTelegram() {
    const handles = ['ajanews', 'alhadath_brk', 'AlArabiya', 'asharqnewsbrk', 'alekhbariyanews', 'rt_arabic'];
    let localCache = [];
    
    for (const h of handles) {
        try {
            const html = directFetch(`https://t.me/s/${h}`);
            
            // Refinement: Target the outer message container more safely
            // Telegram messages almost always have tgme_widget_message_wrap
            const rawMessages = html.split('<div class="tgme_widget_message_wrap');
            rawMessages.shift(); // Remove first chunk before first message

            for (const msgHtml of rawMessages) {
                // Extract Text: Target js-widget_message_text
                const textMatch = msgHtml.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
                const timeMatch = msgHtml.match(/<time[^>]*datetime="([^"]*)"/);
                
                if (textMatch && timeMatch) {
                    const text = textMatch[1].replace(/<[^>]+>/g, '').trim();
                    if (text.length > 2) {
                        localCache.push({
                            title: text,
                            source: 'telegram', sourceHandle: h, sourceName: h,
                            pubDate: new Date(timeMatch[1]).toISOString(),
                            link: `https://t.me/s/${h}`,
                            customAvatar: AVATAR_MAP[h] || 'public/logos/default.png'
                        });
                    }
                }
            }
        } catch (e) {
            console.error(`❌ [TG] Fetch error for @${h}:`, e.message);
        }
    }
    
    if (localCache.length > 0) {
        // Only update if we found items to prevent "disappearing" behavior
        telegramCache = localCache.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 60);
        console.log(`✅ [V8.1] Telegram Updated: ${telegramCache.length} items`);
    } else {
        console.warn(`⚠️ [V8.1] Telegram fetch yielded 0 items. Keeping old cache.`);
    }
}

async function updateTwitter() {
    const handles = ['AlHadath', 'AsharqNewsBrk', 'alrougui', 'AlArabiya_Brk', 'SkyNewsArabia_B', 'RT_Arabic'];
    let localCache = [];

    for (const h of handles) {
        try {
            const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${h}`, { 'Referer': 'https://platform.twitter.com/' });
            const dataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (dataMatch) {
                const data = JSON.parse(dataMatch[1]);
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
                localCache = [...localCache, ...tweets];
            }
        } catch (e) {}
    }

    try {
        const bridge = RSSHUB_BRIDGES[Math.floor(Math.random() * RSSHUB_BRIDGES.length)];
        const xml = stealthFetch(`${bridge}/twitter/list/${LIST_ID}`);
        const entries = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
        for (const m of entries) {
            const c = m[1];
            const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
            const h = c.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
            if (t) {
                const handle = h ? h[1] : 'News';
                localCache.push({
                    title: t[1].replace(/<[^>]+>/g, '').trim(),
                    link: 'https://x.com/i/lists/' + LIST_ID,
                    pubDate: new Date().toISOString(),
                    source: 'twitter', sourceHandle: handle, sourceName: handle,
                    customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                });
            }
        }
    } catch(e) {}

    if (localCache.length > 0) {
        twitterCache = localCache.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 80);
        console.log(`✅ [V8.1] Twitter Updated: ${twitterCache.length}`);
    }
}

// Endpoints
app.get('/api/news/telegram', (req, res) => res.json({ items: telegramCache }));
app.get('/api/news/twitter', (req, res) => res.json({ items: twitterCache }));
app.get('/api/news-v4-list', (req, res) => res.json({ items: [...telegramCache, ...twitterCache].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)) }));
app.get('/ping', (req, res) => res.send('pong'));

// Diagnostic Endpoint
app.get('/debug/telegram', (req, res) => {
    const handle = req.query.h || 'ajanews';
    try {
        const html = directFetch(`https://t.me/s/${handle}`);
        res.type('text/plain').send(html);
    } catch (e) {
        res.status(500).send(e.message);
    }
});

// Boot
setInterval(updateTelegram, TELEGRAM_INTERVAL);
setInterval(updateTwitter, TWITTER_INTERVAL);
setInterval(refreshProxyPool, 600000);

refreshProxyPool().then(() => {
    updateTelegram();
    updateTwitter();
    app.listen(PORT, () => console.log(`🚀 V8.1 ENGINE LIVE ON PORT ${PORT}`));
});
