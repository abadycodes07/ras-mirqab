const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/* ═══════════════════════════════════════════════
   V9 ULTIMATE SCRAPER (1-MIN STABILITY)
   ═══════════════════════════════════════════════ */

const LIST_ID = "2031445708524421549";
const RSSHUB_BRIDGES = [
    'https://rsshub.rssforever.com',
    'https://rsshub.moeyy.cn',
    'https://rss.shab.fun',
    'https://rss.owo.nz'
];

const BROWSER_FINGERPRINTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

let proxyPool = [];

async function refreshProxyPool() {
    try {
        const res = execSync('curl -s "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all"').toString();
        proxyPool = res.split('\n').map(p => p.trim()).filter(p => p && p.includes(':'));
    } catch (e) {}
}

function stealthFetch(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        const ua = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];
        const proxy = proxyPool.length > 0 ? proxyPool[Math.floor(Math.random() * proxyPool.length)] : null;
        try {
            const proxyCmd = proxy ? `-x http://${proxy}` : '';
            const result = execSync(`curl -L ${proxyCmd} -H "User-Agent: ${ua}" --connect-timeout 8 --max-time 15 "${url}"`).toString();
            if (result.length > 200) return result;
        } catch (e) {}
    }
    return '';
}

async function scrape() {
    console.log('🚀 [V9 Scraper] Cycle Started...');
    await refreshProxyPool();
    
    const outputPath = path.join(process.cwd(), 'public', 'news.json');
    let existingItems = [];
    try { if (fs.existsSync(outputPath)) existingItems = JSON.parse(fs.readFileSync(outputPath)).items || []; } catch (e) {}

    let allResults = [];
    
    // Protocol 1: Aggressive Parallel Fetching
    const handles = ['AlHadath', 'AsharqNewsBrk', 'alrougui', 'SkyNewsArabia_B', 'RT_Arabic'];
    for (const h of handles) {
        try {
            const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${h}`);
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
                        image: t.entities?.media?.[0]?.media_url_https || null
                    };
                }).filter(Boolean);
                allResults = [...allResults, ...tweets];
            }
        } catch (e) {}
    }

    // Protocol 2: Solid Google Bridge (The "Iron" Layer)
    try {
        const bridgeUrl = "https://script.google.com/macros/s/AKfycby5zEAZmyEz_9juaCih69PnbxW35I-EuZx3Z7TCRYlAD38r20Bz4_TiOa53yBjBMeYQaA/exec";
        const xml = stealthFetch(bridgeUrl); 
        const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
        for (const m of matches) {
            const c = m[1];
            const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
            const h = c.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
            if (t) {
                allResults.push({
                    title: t[1].replace(/<[^>]+>/g, '').trim(),
                    link: 'https://x.com/i/lists/' + LIST_ID,
                    pubDate: new Date().toISOString(),
                    source: 'twitter', sourceHandle: h ? h[1] : 'News', sourceName: h ? h[1] : 'News'
                });
            }
        }
    } catch (e) {}

    // Protocol 3: List RSS Fallback
    if (allResults.length < 10) {
        const bridge = RSSHUB_BRIDGES[Math.floor(Math.random() * RSSHUB_BRIDGES.length)];
        try {
            console.log(`📡 [Bridge] Trying ${bridge}...`);
            const xml = stealthFetch(`${bridge}/twitter/list/${LIST_ID}`);
            const entries = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
            for (const m of entries) {
                const c = m[1];
                const t = c.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || c.match(/<title>([\s\S]*?)<\/title>/);
                const h = c.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
                if (t) {
                    allResults.push({
                        title: t[1].replace(/<[^>]+>/g, '').trim(),
                        link: 'https://x.com/i/lists/' + LIST_ID,
                        pubDate: new Date().toISOString(),
                        source: 'twitter', sourceHandle: h ? h[1] : 'News', sourceName: h ? h[1] : 'News'
                    });
                }
            }
        } catch (e) {}
    }

    const combined = [...allResults, ...existingItems];
    combined.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
    const seen = new Set();
    const final = combined.filter(i => {
        const k = (i.title || '').substring(0,80) + i.sourceHandle;
        if (seen.has(k)) return false;
        seen.add(k); return true;
    }).slice(0, 200);

    if (final.length > 0) {
        fs.writeFileSync(outputPath, JSON.stringify({ items: final, lastUpdated: new Date().toISOString() }, null, 2));
        console.log(`✅ [V9] Success. Saved ${final.length} cumulative items.`);
    }
}

scrape();
