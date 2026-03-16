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
        const res = execSync(cmd).toString();
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
    }
}

async function updateTwitter() {
    console.log('📡 [V9.5] Twitter Cumulative Cycle...');
    let localItems = [];

    // Protocol 1: Parallel Syndicated Handles
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
    const p1Items = syncResults.flat();
    if (p1Items.length > 0) {
        localItems = [...localItems, ...p1Items];
        console.log(`📡 [V9] P1 (Syndication) found ${p1Items.length} items`);
    }

    // Protocol 2: Solid Google Bridge (The "Iron" Layer)
    try {
        const bridgeUrl = "https://script.google.com/macros/s/AKfycbz19BN54zFLRdO0FQ-C2aDGx-AEYlYC_s04ke2MoYE53WNkjHVAfRLjHMik1VgABKwAEA/exec";
        const xml = stealthFetch(bridgeUrl, false); 
        const rssMatch = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        if (rssMatch.length > 0) {
            console.log(`📡 [V9] P2 (Google Bridge) found ${rssMatch.length} items`);
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
    } catch(e) {
        console.log(`❌ [V9] P2 Error: ${e.message}`);
    }

    // Protocol 3: Multi-Bridge List RSS (Fallback)
    try {
        if (localItems.length < 5) { 
            const bridge = RSSHUB_BRIDGES[Math.floor(Math.random() * RSSHUB_BRIDGES.length)];
            const xml = stealthFetch(`${bridge}/twitter/list/${LIST_ID}`, true);
            const rssMatch = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
            if (rssMatch.length > 0) {
                console.log(`📡 [V9] P3 (RSS Bridge) found ${rssMatch.length} items`);
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
        }
    } catch(e) {}

    if (localItems.length > 0) {
        twitterCache = mergeCache(twitterCache, localItems, 120);
        console.log(`✅ [V9.5] Twitter Cumulative: ${twitterCache.length}`);
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
