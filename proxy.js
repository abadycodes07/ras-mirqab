/* ═══════════════════════════════════════════════
   V7 RESILIENCE ENGINE (SCRAPE.DO METHODOLOGY)
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
    { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36', 'Accept-Language': 'ar-SA,ar;q=0.9' }
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

// CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Self-Monitoring & Fault Tolerance
process.on('uncaughtException', (err) => {
    console.error('🔥 CRITICAL ERROR:', err);
});

async function refreshProxyPool() {
    console.log('🔄 [V7] Refreshing Proxy Pool...');
    try {
        const res = execSync('curl -s "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all"').toString();
        const fresh = res.split('\n').map(p => p.trim()).filter(p => p && p.includes(':'));
        if (fresh.length > 5) proxyPool = fresh;
        console.log(`✅ [V7] Pool size: ${proxyPool.length}`);
    } catch (e) {
        console.warn('⚠️ [V7] Proxy refresh failed, using last known pool.');
    }
}

/**
 * Scrape.do Methodology: Stealth, Rotation, and Aggressive Fallbacks
 */
function stealthFetch(url, customHeaders = {}, maxRetries = 3) {
    let lastError = null;
    
    for (let i = 0; i < maxRetries; i++) {
        const fingerprint = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];
        const proxy = proxyPool.length > 0 ? proxyPool[Math.floor(Math.random() * proxyPool.length)] : null;
        
        try {
            const proxyCmd = proxy ? `-x http://${proxy}` : '';
            const headers = { ...fingerprint, ...customHeaders };
            const headersCmd = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
            
            const cmd = `curl -L ${proxyCmd} ${headersCmd} --connect-timeout 5 --max-time 12 "${url}"`;
            const result = execSync(cmd).toString();
            
            if (result.length < 50 && (result.includes('Forbidden') || result.includes('Rate limit'))) {
                throw new Error('Blocked');
            }
            return result;
        } catch (e) {
            lastError = e;
            console.warn(`⚠️ [stealthFetch] Retry ${i+1}/${maxRetries} failed for ${url.substring(0, 30)}...`);
        }
    }
    
    // Final direct attempt if proxies failed
    try {
        const hCmd = `-H "User-Agent: ${BROWSER_FINGERPRINTS[0]['User-Agent']}"`;
        return execSync(`curl -L ${hCmd} --connect-timeout 4 --max-time 8 "${url}"`).toString();
    } catch (e) {
        throw lastError;
    }
}

// Telegram: Straightforward Direct Flow
async function fetchTelegram(handle) {
    try {
        const html = stealthFetch(`https://t.me/s/${handle}`);
        const results = [];
        const messages = html.matchAll(/<div class="tgme_widget_message_wrap[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g);
        for (const msgMatch of messages) {
            const msgHtml = msgMatch[1];
            const textMatch = msgHtml.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
            const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : null;
            const timeMatch = msgHtml.match(/<time[^>]*datetime="([^"]*)"/);
            if (text && timeMatch) {
                results.push({
                    title: text,
                    source: 'telegram',
                    sourceHandle: handle, sourceName: handle,
                    pubDate: new Date(timeMatch[1]).toISOString(),
                    link: `https://t.me/s/${handle}`,
                    customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                });
            }
        }
        return results.reverse().slice(0, 15);
    } catch (e) { return []; }
}

async function updateLoops() {
    // 1. Telegram (Fast)
    try {
        const tgHandles = ['ajanews', 'alhadath_brk', 'AlArabiya', 'asharqnewsbrk'];
        const tgResults = await Promise.all(tgHandles.map(h => fetchTelegram(h)));
        telegramCache = tgResults.flat().sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 40);
    } catch (e) {}

    // 2. Twitter (Thorough)
    try {
        const twHandles = ['AlHadath', 'AsharqNewsBrk', 'alrougui', 'AlArabiya_Brk', 'SkyNewsArabia_B', 'RT_Arabic'];
        const twResults = await Promise.all(twHandles.map(async h => {
            try {
                const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${h}`, { 'Referer': 'https://platform.twitter.com/' });
                const json = JSON.parse(html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)[1]);
                return json.props.pageProps.timeline.entries.map(e => ({
                    title: e.content.tweet.full_text,
                    link: `https://x.com/${h}/status/${e.content.tweet.id_str}`,
                    pubDate: new Date(e.content.tweet.created_at).toISOString(),
                    source: 'twitter', sourceHandle: h, sourceName: h,
                    image: e.content.tweet.entities?.media?.[0]?.media_url_https || null,
                    customAvatar: AVATAR_MAP[h] || 'public/logos/default.png'
                }));
            } catch(e) { return []; }
        }));

        // List Fetch
        let listItems = [];
        try {
            const bridge = RSSHUB_BRIDGES[Math.floor(Math.random() * RSSHUB_BRIDGES.length)];
            const xml = stealthFetch(`${bridge}/twitter/list/${LIST_ID}`);
            const itemMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
            for (const m of itemMatch) {
                const c = m[1];
                const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
                const h = c.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
                if (t) {
                    const handle = h ? h[1] : 'News';
                    listItems.push({
                        title: t[1].replace(/<[^>]+>/g, '').trim(),
                        link: 'https://x.com/i/lists/' + LIST_ID,
                        pubDate: new Date().toISOString(),
                        source: 'twitter', sourceHandle: handle, sourceName: handle,
                        customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                    });
                }
            }
        } catch(e) {}

        twitterCache = [...twResults.flat(), ...listItems].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 80);
    } catch (e) {}
    
    console.log(`📊 [V7 Cache] TG: ${telegramCache.length} | TW: ${twitterCache.length}`);
}

// Endpoints
app.get('/api/news/telegram', (req, res) => res.json({ items: telegramCache }));
app.get('/api/news/twitter', (req, res) => res.json({ items: twitterCache }));
app.get('/api/news-v4-list', (req, res) => res.json({ items: [...telegramCache, ...twitterCache].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)) }));
app.get('/ping', (req, res) => res.send('pong'));

// Keep-Alive Loop (Self-Ping)
setInterval(() => {
    try { execSync('curl -s https://ras-mirqab-proxy.onrender.com/ping'); } catch (e) {}
}, 45000);

// Intervals
setInterval(updateLoops, TELEGRAM_INTERVAL);
setInterval(refreshProxyPool, 300000); // 5 mins

// Boot
refreshProxyPool().then(() => {
    updateLoops();
    app.listen(PORT, () => console.log(`🚀 V7 RESILIENCE ACTIVE ON ${PORT}`));
});
