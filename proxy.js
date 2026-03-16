/* ═══════════════════════════════════════════════
   V6 HYBRID-STABILITY ENGINE - RAS MIRQAB
   ═══════════════════════════════════════════════ */

const express = require('express');
const { execSync } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const LIST_ID = "2031445708524421549";
const RSSHUB_BRIDGES = [
    'https://rsshub.rssforever.com',
    'https://rsshub.moeyy.cn',
    'https://rss.shab.fun',
    'https://rss.owo.nz'
];

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const AVATAR_MAP = {
    'AsharqNewsBrk': 'public/logos/asharq2.jpg',
    'AlHadath': 'public/logos/alhadath3.png',
    'NewsNow4USA': 'public/logos/newsnow.jpg',
    'modgovksa': 'public/logos/modgovksa2.png',
    'alrougui': 'public/logos/alrougui.jpg',
    'alekhbariyabrk': 'public/logos/alekhbariya.jpg',
    'RTonline_ar': 'public/logos/rt.png',
    'AlArabiya_Brk': 'public/logos/alarabiya.png',
    'SkyNewsArabia_B': 'public/logos/skynews.png',
    'SkyNewsArabia_Breaking': 'public/logos/skynews.png',
    'RT_Arabic': 'public/logos/rt.png',
    'ajmubasher': 'public/logos/aljazeera.png',
    'i24news-ar': 'public/logos/i24news.png',
    'sabq-org': 'public/logos/sabq.png',
    'ajanews': 'public/logos/ajanews_new.png',
    'alhadath_brk': 'public/logos/alhadath3.png',
    'AlArabiya': 'public/logos/alarabiya.png',
    'asharqnewsbrk': 'public/logos/asharq2.jpg',
    'alekhbariyanews': 'public/logos/alekhbariya.jpg',
    'rt_arabic': 'public/logos/rt.png'
};

// Global State
let proxyPool = [];
let telegramCache = [];
let twitterCache = [];

const TELEGRAM_INTERVAL = 15000; // 15 seconds
const TWITTER_INTERVAL = 120000; // 2 minutes

// CORS Middleware
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
        proxyPool = res.split('\n').map(p => p.trim()).filter(p => p && p.includes(':'));
    } catch (e) {}
}

function stealthFetch(url, customHeaders = {}) {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const proxy = proxyPool.length > 0 ? proxyPool[Math.floor(Math.random() * proxyPool.length)] : null;
    
    try {
        const proxyCmd = proxy ? `-x http://${proxy}` : '';
        const headersCmd = Object.entries({ 'User-Agent': ua, ...customHeaders })
            .map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
        
        const cmd = `curl -L ${proxyCmd} ${headersCmd} --connect-timeout 8 --max-time 15 "${url}"`;
        const result = execSync(cmd).toString();
        if (result.includes('Rate limit exceeded') || result.includes('403 Forbidden')) throw new Error('Blocked');
        return result;
    } catch (e) {
        try {
            const hCmd = Object.entries({ 'User-Agent': ua, ...customHeaders })
                .map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
            return execSync(`curl -L ${hCmd} --connect-timeout 5 --max-time 10 "${url}"`).toString();
        } catch(e2) { throw e2; }
    }
}

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
            const photoMatch = msgHtml.match(/tgme_widget_message_photo_wrap[^>]*style="background-image:url\('([^']+)'\)"/i);
            if (text && timeMatch) {
                results.push({
                    title: text.substring(0, 500),
                    source: 'telegram',
                    sourceHandle: handle, sourceName: handle,
                    pubDate: new Date(timeMatch[1]).toISOString(),
                    link: `https://t.me/s/${handle}`,
                    image: (handle === 'ajanews' || handle === 'alhadath_brk') ? AVATAR_MAP[handle] : (photoMatch ? photoMatch[1] : null),
                    customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                });
            }
        }
        return results.reverse().slice(0, 15);
    } catch (e) { return []; }
}

async function updateTelegramLoop() {
    const handles = ['ajanews', 'alhadath_brk', 'AlArabiya', 'asharqnewsbrk', 'alekhbariyanews', 'rt_arabic'];
    try {
        const results = await Promise.all(handles.map(h => fetchTelegram(h)));
        telegramCache = results.flat().sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 50);
        console.log(`✅ [TG] Cache updated: ${telegramCache.length}`);
    } catch (e) {}
}

async function updateTwitterLoop() {
    if (proxyPool.length < 5) await refreshProxyPool();
    const fetchTwitterSyndication = async (username) => {
        try {
            const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`, { 'Referer': 'https://platform.twitter.com/' });
            const dataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (!dataMatch) return null;
            const tweets = JSON.parse(dataMatch[1]).props.pageProps.timeline.entries;
            return tweets.map(entry => {
                const t = entry.content.tweet;
                if (!t) return null;
                return {
                    title: t.full_text, link: `https://x.com/${username}/status/${t.id_str}`,
                    pubDate: new Date(t.created_at).toISOString(),
                    source: 'twitter', sourceHandle: username, sourceName: username,
                    image: t.entities?.media?.[0]?.media_url_https || null,
                    customAvatar: AVATAR_MAP[username] || 'public/logos/default.png'
                };
            }).filter(Boolean);
        } catch (e) { return null; }
    };

    try {
        const handles = ['AlHadath', 'AsharqNewsBrk', 'alrougui', 'AlArabiya_Brk', 'SkyNewsArabia_B', 'RT_Arabic', 'alekhbariyabrk', 'ajmubasher'];
        const results = await Promise.all(handles.map(h => fetchTwitterSyndication(h)));
        let listItems = [];
        const bridge = RSSHUB_BRIDGES[Math.floor(Math.random() * RSSHUB_BRIDGES.length)];
        try {
            const xml = stealthFetch(`${bridge}/twitter/list/${LIST_ID}`);
            if (xml.includes('<item>')) {
                const items = [];
                const itemMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
                for (const m of itemMatch) {
                    const content = m[1];
                    const tMatch = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || content.match(/<title>([\s\S]*?)<\/title>/);
                    const lMatch = content.match(/<link>([\s\S]*?)<\/link>/);
                    const pMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
                    const cMatch = content.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
                    if (tMatch && pMatch) {
                        const h = cMatch ? cMatch[1] : 'News';
                        items.push({
                            title: tMatch[1].replace(/<[^>]+>/g, '').trim(),
                            link: (lMatch ? lMatch[1] : '').replace(/nitter\.[a-z.]+/g, 'x.com'),
                            pubDate: new Date(pMatch[1]).toISOString(),
                            source: 'twitter', sourceHandle: h, sourceName: h,
                            customAvatar: AVATAR_MAP[h] || 'public/logos/default.png'
                        });
                    }
                }
                listItems = items;
            }
        } catch(e) {}

        const combined = [...results.flat().filter(Boolean), ...listItems];
        twitterCache = combined.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 100);
        console.log(`✅ [TW] Cache updated: ${twitterCache.length}`);
    } catch (e) {}
}

app.get('/api/news/telegram', (req, res) => res.json({ items: telegramCache }));
app.get('/api/news/twitter', (req, res) => res.json({ items: twitterCache }));
app.get('/api/news-v4-list', (req, res) => res.json({ items: [...telegramCache, ...twitterCache].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)) }));
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));

setInterval(updateTelegramLoop, TELEGRAM_INTERVAL);
setInterval(updateTwitterLoop, TWITTER_INTERVAL);
updateTelegramLoop();
updateTwitterLoop();

app.listen(PORT, () => console.log(`🚀 V6 ENGINE ACTIVE ON ${PORT}`));
