/* ═══════════════════════════════════════════════
   V8 ULTIMATE ENGINE (DIRECT-TELEGRAM & STEALTH-TWITTER)
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
    { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept-Language': 'en-GB,en;q=0.8' }
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

/**
 * Direct Fetch (Safe for Telegram)
 */
function directFetch(url) {
    const fingerprint = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];
    const headers = { ...fingerprint };
    const hCmd = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
    return execSync(`curl -L ${hCmd} --connect-timeout 8 --max-time 15 "${url}"`).toString();
}

/**
 * Stealth Fetch (For Twitter)
 */
function stealthFetch(url, customHeaders = {}, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        const fingerprint = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];
        const proxy = proxyPool.length > 0 ? proxyPool[Math.floor(Math.random() * proxyPool.length)] : null;
        try {
            const proxyCmd = proxy ? `-x http://${proxy}` : '';
            const headers = { ...fingerprint, ...customHeaders };
            const hCmd = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
            const result = execSync(`curl -L ${proxyCmd} ${hCmd} --connect-timeout 8 --max-time 15 "${url}"`).toString();
            if (result.length > 100) return result;
        } catch (e) {}
    }
    return directFetch(url); // Fatal fallback
}

// Telegram Flow: Straight to Cache
async function updateTelegram() {
    console.log('📡 [V8] Telegram Scrape Cycle Initiated...');
    const handles = ['ajanews', 'alhadath_brk', 'AlArabiya', 'asharqnewsbrk', 'alekhbariyanews', 'rt_arabic'];
    let localCache = [];
    
    for (const h of handles) {
        try {
            const html = directFetch(`https://t.me/s/${h}`);
            const messages = html.matchAll(/<div class="tgme_widget_message_wrap[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g);
            for (const m of messages) {
                const msgHtml = m[1];
                const textMatch = msgHtml.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
                const timeMatch = msgHtml.match(/<time[^>]*datetime="([^"]*)"/);
                if (textMatch && timeMatch) {
                    localCache.push({
                        title: textMatch[1].replace(/<[^>]+>/g, '').trim(),
                        source: 'telegram', sourceHandle: h, sourceName: h,
                        pubDate: new Date(timeMatch[1]).toISOString(),
                        link: `https://t.me/s/${h}`,
                        customAvatar: AVATAR_MAP[h] || 'public/logos/default.png'
                    });
                }
            }
        } catch (e) {}
    }
    if (localCache.length > 0) {
        telegramCache = localCache.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 50);
        console.log(`✅ [V8] Telegram Updated: ${telegramCache.length}`);
    }
}

async function updateTwitter() {
    console.log('📡 [V8] Twitter Scrape Cycle Initiated...');
    const handles = ['AlHadath', 'AsharqNewsBrk', 'alrougui', 'AlArabiya_Brk', 'SkyNewsArabia_B', 'RT_Arabic'];
    let localCache = [];

    for (const h of handles) {
        try {
            const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${h}`, { 'Referer': 'https://platform.twitter.com/' });
            const data = JSON.parse(html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)[1]);
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
        } catch (e) {}
    }

    // List Support
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
        console.log(`✅ [V8] Twitter Updated: ${twitterCache.length}`);
    }
}

app.get('/api/news/telegram', (req, res) => res.json({ items: telegramCache }));
app.get('/api/news/twitter', (req, res) => res.json({ items: twitterCache }));
app.get('/api/news-v4-list', (req, res) => res.json({ items: [...telegramCache, ...twitterCache].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)) }));
app.get('/ping', (req, res) => res.send('pong'));

// Boot sequence
setInterval(updateTelegram, TELEGRAM_INTERVAL);
setInterval(updateTwitter, TWITTER_INTERVAL);
setInterval(refreshProxyPool, 600000); // 10 mins

refreshProxyPool().then(() => {
    updateTelegram();
    updateTwitter();
    app.listen(PORT, () => console.log(`🚀 V8 ENGINE LIVE ON PORT ${PORT}`));
});
