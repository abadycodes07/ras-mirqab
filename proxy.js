/* ═══════════════════════════════════════════════
   V5 SPLIT-CORE ENGINE - RAS MIRQAB
   ═══════════════════════════════════════════════ */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
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
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

const AVATAR_MAP = {
    'AsharqNewsBrk': 'public/logos/asharq2.jpg',
    'AlHadath': 'public/logos/alhadath3.png',
    'NewsNow4USA': 'public/logos/newsnow.jpg',
    'modgovksa': 'public/logos/modgovksa2.png',
    'alrougui': 'public/logos/alrougui.jpg',
    'alekhbariyaNews': 'public/logos/alekhbariya.jpg',
    'RTonline_ar': 'public/logos/rt.png',
    'AlArabiya_Brk': 'public/logos/alarabiya.png',
    'SkyNewsArabia_B': 'public/logos/skynews.png',
    'SABQ_NEWS': 'public/logos/sabq.png',
    'AjelNews24': 'public/logos/ajelnews.jpg',
    'RT_Arabic': 'public/logos/rt.png',
    'ajmubasher': 'public/logos/aljazeera.png',
    'ajanews': 'public/logos/ajanews_new.png',
    'alhadath_brk': 'public/logos/alhadath3.png',
    'AlArabiya': 'public/logos/alarabiya.png',
    'asharqnewsbrk': 'public/logos/asharq2.jpg',
    'alekhbariyanews': 'public/logos/alekhbariya.jpg',
    'rt_arabic': 'public/logos/rt.png'
};

// Global State
let publicProxyList = [];
let telegramCache = [];
let twitterCache = [];
let sourceHealth = {};

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

/**
 * Ultimate Stealth Fetcher
 */
async function stealthFetch(url, customHeaders = {}) {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const proxy = publicProxyList.length > 0 ? publicProxyList[Math.floor(Math.random() * publicProxyList.length)] : null;
    
    try {
        const { execSync } = require('child_process');
        const proxyCmd = proxy ? `-x http://${proxy}` : '';
        const headersCmd = Object.entries({ 'User-Agent': ua, ...customHeaders })
            .map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
        
        const cmd = `curl -L ${proxyCmd} ${headersCmd} --connect-timeout 8 --max-time 15 "${url}"`;
        const result = execSync(cmd).toString();
        
        if (result.includes('Rate limit exceeded') || result.includes('403 Forbidden')) {
            throw new Error('Blocked/RateLimited');
        }
        return result;
    } catch (e) {
        // Fallback to direct fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, { 
            headers: { 'User-Agent': ua, ...customHeaders },
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        return await response.text();
    }
}

function parseListRSS(xml) {
    const items = [];
    const itemMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatch) {
        const content = match[1];
        const titleMatch = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || content.match(/<title>([\s\S]*?)<\/title>/);
        let fullTitle = titleMatch ? titleMatch[1] : "";
        const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
        let link = linkMatch ? linkMatch[1] : "";
        const creatorMatch = content.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
        let handle = creatorMatch ? creatorMatch[1] : "";
        const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const descMatch = content.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || content.match(/<description>([\s\S]*?)<\/description>/);
        const desc = descMatch ? descMatch[1] : "";
        const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i);
        let mediaUrl = imgMatch ? imgMatch[1] : null;

        if (fullTitle && pubDateMatch) {
            items.push({
                title: fullTitle.replace(/<[^>]+>/g, '').trim(),
                link: link.replace(/nitter\.[a-z.]+/g, 'x.com'),
                pubDate: new Date(pubDateMatch[1]).toISOString(),
                source: 'twitter',
                sourceHandle: handle || 'news',
                sourceName: handle || 'News',
                image: mediaUrl,
                customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
            });
        }
    }
    return items;
}

async function fetchTelegram(handle) {
    try {
        const html = await stealthFetch(`https://t.me/s/${handle}`);
        const results = [];
        const messages = html.matchAll(/<div class="tgme_widget_message_wrap[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g);
        for (const msgMatch of messages) {
            const msgHtml = msgMatch[1];
            const textMatch = msgHtml.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
            const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : null;
            const timeMatch = msgHtml.match(/<time[^>]*datetime="([^"]*)"/);
            const photoMatch = msgHtml.match(/tgme_widget_message_photo_wrap[^>]*style="background-image:url\('([^']+)'\)"/i);
            const mediaUrl = photoMatch ? photoMatch[1] : null;

            if (text && timeMatch) {
                results.push({
                    title: text.substring(0, 500),
                    source: 'telegram',
                    sourceHandle: handle,
                    sourceName: handle,
                    pubDate: new Date(timeMatch[1]).toISOString(),
                    link: `https://t.me/s/${handle}`,
                    image: (handle === 'ajanews' || handle === 'alhadath_brk') ? AVATAR_MAP[handle] : mediaUrl,
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
        console.log(`✅ [Telegram] Cache updated: ${telegramCache.length} items`);
    } catch (e) {}
}

async function updateTwitterLoop() {
    const fetchTwitterSyndication = async (username) => {
        try {
            const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}`;
            const html = await stealthFetch(url, { 'Referer': 'https://platform.twitter.com/' });
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
                    sourceHandle: username,
                    sourceName: username,
                    image: t.entities?.media?.[0]?.media_url_https || null,
                    customAvatar: AVATAR_MAP[username] || 'public/logos/default.png'
                };
            }).filter(Boolean);
        } catch (e) { return null; }
    };

    try {
        const critical = await Promise.all(['alrougui', 'AlHadath', 'AsharqNewsBrk'].map(h => fetchTwitterSyndication(h)));
        let listItems = [];
        const bridge = RSSHUB_BRIDGES[Math.floor(Math.random() * RSSHUB_BRIDGES.length)];
        try {
            const xml = await stealthFetch(`${bridge}/twitter/list/${LIST_ID}`);
            if (xml.includes('<item>')) listItems = parseListRSS(xml);
        } catch(e) {}

        const combined = [...critical.flat().filter(Boolean), ...listItems];
        twitterCache = combined.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 100);
        console.log(`✅ [Twitter] Cache updated: ${twitterCache.length} items`);
    } catch (e) {}
}

// Routes
app.get('/api/news/telegram', (req, res) => res.json({ items: telegramCache }));
app.get('/api/news/twitter', (req, res) => res.json({ items: twitterCache }));
app.get('/api/news-v4-list', (req, res) => {
    const combined = [...telegramCache, ...twitterCache].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.json({ items: combined });
});
app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));

// Loops
setInterval(updateTelegramLoop, TELEGRAM_INTERVAL);
setInterval(updateTwitterLoop, TWITTER_INTERVAL);
updateTelegramLoop();
updateTwitterLoop();

app.listen(PORT, () => console.log(`🚀 SPLIT-ENGINE ACTIVE ON PORT ${PORT}`));
