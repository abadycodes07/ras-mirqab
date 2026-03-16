const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const LIST_ID = "2031445708524421549";
const RSSHUB_BRIDGES = [
    'https://rsshub.rssforever.com',
    'https://rsshub.moeyy.cn',
    'https://rss.shab.fun',
    'https://rss.owo.nz',
    'https://rsshub.app'
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
    'AlArabiya': 'public/logos/alarabiya.png'
};

let proxyPool = [];

async function refreshProxyPool() {
    try {
        const res = execSync('curl -s "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all"').toString();
        proxyPool = res.split('\n').map(p => p.trim()).filter(p => p && p.includes(':'));
        console.log(`✅ [Proxy] Pool refreshed: ${proxyPool.length}`);
    } catch (e) {
        console.warn('⚠️ [Proxy] Refresh failed.');
    }
}

function stealthFetch(url, customHeaders = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        const fingerprint = BROWSER_FINGERPRINTS[Math.floor(Math.random() * BROWSER_FINGERPRINTS.length)];
        const proxy = proxyPool.length > 0 ? proxyPool[Math.floor(Math.random() * proxyPool.length)] : null;
        try {
            const proxyCmd = proxy ? `-x http://${proxy}` : '';
            const headers = { ...fingerprint, ...customHeaders };
            const hCmd = Object.entries(headers).map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
            const result = execSync(`curl -L ${proxyCmd} ${hCmd} --connect-timeout 8 --max-time 15 "${url}"`).toString();
            if (result.length > 200) return result;
        } catch (e) {}
    }
    // Fatal fallback
    try {
        const hCmd = `-H "User-Agent: ${BROWSER_FINGERPRINTS[0]['User-Agent']}"`;
        return execSync(`curl -L ${hCmd} --connect-timeout 6 --max-time 10 "${url}"`).toString();
    } catch (e) { return ''; }
}

async function scrape() {
    console.log('🚀 [V8 Scraper] Cycle Started...');
    await refreshProxyPool();
    
    const outputPath = path.join(process.cwd(), 'public', 'news.json');
    let existingItems = [];
    try { if (fs.existsSync(outputPath)) existingItems = JSON.parse(fs.readFileSync(outputPath)).items || []; } catch (e) {}

    let allResults = [];
    const handles = ['AlHadath', 'AsharqNewsBrk', 'alrougui', 'AlArabiya_Brk', 'SkyNewsArabia_B', 'RT_Arabic', 'alekhbariyabrk'];

    for (const h of handles) {
        try {
            const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${h}`, { 'Referer': 'https://platform.twitter.com/' });
            const dataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (dataMatch) {
                const data = JSON.parse(dataMatch[1]);
                const items = data.props.pageProps.timeline.entries.map(entry => {
                    const t = entry.content.tweet;
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
                allResults = [...allResults, ...items];
            }
        } catch (e) {}
    }

    // Twitter List (Scrape.do style list fetch)
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
                const handle = h ? h[1] : 'News';
                allResults.push({
                    title: t[1].replace(/<[^>]+>/g, '').trim(),
                    link: 'https://x.com/i/lists/' + LIST_ID,
                    pubDate: new Date().toISOString(),
                    source: 'twitter', sourceHandle: handle, sourceName: handle,
                    customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                });
            }
        }
    } catch (e) {}

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
        console.log(`✅ [V8] Success. Saved ${final.length} items.`);
    }
}

scrape();
