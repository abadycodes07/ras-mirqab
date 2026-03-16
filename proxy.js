/* ═══════════════════════════════════════════════
   V9 ULTIMATE ENGINE (SOLID-STEALTH)
   ═══════════════════════════════════════════════ */

const express = require('express');
const { execSync } = require('child_process');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const LIST_ID = "2031445708524421549";
const TELEGRAM_INTERVAL = 7000; 
const TWITTER_INTERVAL = 60000; // 1 Minute Goal

const RSSHUB_BRIDGES = [
    'https://rsshub.rssforever.com',
    'https://rsshub.moeyy.cn',
    'https://rss.shab.fun',
    'https://rss.owo.nz',
    'https://rsshub.app'
];

const BROWSER_FINGERPRINTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
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
        return execSync(cmd).toString();
    } catch (e) {
        return '';
    }
}

async function updateTelegram() {
    const handles = ['ajanews', 'alhadath_brk', 'AlArabiya', 'asharqnewsbrk', 'alekhbariyanews', 'rt_arabic'];
    let localCache = [];
    
    for (const h of handles) {
        try {
            const html = stealthFetch(`https://t.me/s/${h}`, false); // Direct for TG
            const chunks = html.split('<div class="tgme_widget_message_wrap');
            chunks.shift();
            for (const msgHtml of chunks) {
                const textM = msgHtml.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
                const timeM = msgHtml.match(/<time[^>]*datetime="([^"]*)"/);
                if (textM && timeM) {
                    localCache.push({
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
    if (localCache.length > 0) {
        telegramCache = localCache.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 60);
    }
}

async function updateTwitter() {
    console.log('📡 [V9] Twitter Stealth Cycle...');
    let localCache = [];

    // Protocol 1: Parallel Syndicated Handles (Very Fast)
    const handles = ['AlHadath', 'SkyNewsArabia_B', 'RT_Arabic', 'AsharqNewsBrk', 'alrougui'];
    const syncResults = await Promise.all(handles.map(async h => {
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
    localCache = [...localCache, ...syncResults.flat()];

    // Protocol 2: Solid Google Bridge (The "Iron" Layer)
    try {
        const bridgeUrl = "https://script.google.com/macros/s/AKfycby5zEAZmyEz_9juaCih69PnbxW35I-EuZx3Z7TCRYlAD38r20Bz4_TiOa53yBjBMeYQaA/exec";
        const xml = stealthFetch(bridgeUrl, false); // Direct fetch from Google Bridge
        const rssMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
        for (const m of rssMatch) {
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

    // Protocol 3: Multi-Bridge List RSS (Fallback)
    try {
        if (localCache.length < 10) {
            const bridge = RSSHUB_BRIDGES[Math.floor(Math.random() * RSSHUB_BRIDGES.length)];
            const xml = stealthFetch(`${bridge}/twitter/list/${LIST_ID}`, true);
            const rssMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
            for (const m of rssMatch) {
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
        }
    } catch(e) {}

    if (localCache.length > 0) {
        twitterCache = localCache.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 100);
        console.log(`✅ [V9] Twitter Stable: ${twitterCache.length}`);
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
