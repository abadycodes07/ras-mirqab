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

const NITTER_INSTANCES = [
    'https://nitter.net',
    'https://nitter.cz',
    'https://nitter.it',
    'https://nitter.unixfox.eu',
    'https://nitter.privacydev.net'
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
    'ajanews': 'public/logos/ajanews_new.png',
    'alhadath_brk': 'public/logos/alhadath3.png',
    'AlArabiya': 'public/logos/alarabiya.png',
    'asharqnewsbrk': 'public/logos/asharq2.jpg',
    'alekhbariyanews': 'public/logos/alekhbariya.jpg',
    'rt_arabic': 'public/logos/rt.png'
};

let proxyPool = [];

async function refreshProxyPool() {
    console.log('🔄 [Proxy] Refreshing pool...');
    try {
        const res = execSync('curl -s "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=5000&country=all&ssl=all&anonymity=all"').toString();
        proxyPool = res.split('\n').map(p => p.trim()).filter(p => p && p.includes(':'));
        console.log(`✅ [Proxy] Pool loaded: ${proxyPool.length} proxies.`);
    } catch (e) {
        console.warn('⚠️ [Proxy] Pool refresh failed.');
    }
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
        
        if (result.includes('Rate limit exceeded') || result.includes('403 Forbidden')) {
            throw new Error('Blocked/RateLimited');
        }
        return result;
    } catch (e) {
        // Direct fallback
        const headersCmd = Object.entries({ 'User-Agent': ua, ...customHeaders })
            .map(([k, v]) => `-H "${k}: ${v}"`).join(' ');
        try {
            return execSync(`curl -L ${headersCmd} --connect-timeout 5 --max-time 10 "${url}"`).toString();
        } catch(e2) {
            throw e2;
        }
    }
}

function parseRSS(xml) {
    const items = [];
    const itemMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatch) {
        const content = match[1];
        const titleMatch = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || content.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const creatorMatch = content.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
        const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);
        const imgMatch = descMatch ? descMatch[1].match(/<img[^>]+src="([^"]+)"/i) : null;
        
        if ((titleMatch && pubDateMatch)) {
            const handle = creatorMatch ? creatorMatch[1] : 'News';
            items.push({
                title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
                link: (linkMatch ? linkMatch[1] : '').replace(/nitter\.[a-z.]+/g, 'x.com'),
                pubDate: new Date(pubDateMatch[1]).toISOString(),
                source: 'twitter',
                sourceHandle: handle,
                sourceName: handle,
                image: imgMatch ? imgMatch[1] : null,
                customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
            });
        }
    }
    return items;
}

async function scrape() {
    console.log('🚀 [Twitter Scraper] Initiating V6 Resilient Scrape...');
    await refreshProxyPool();
    
    const outputPath = path.join(process.cwd(), 'public', 'news.json');
    let existingItems = [];
    try {
        if (fs.existsSync(outputPath)) {
            existingItems = JSON.parse(fs.readFileSync(outputPath)).items || [];
        }
    } catch (e) {}

    let allResults = [];

    // Strategy 1: Multi-Handle Syndication (Very Reliable with Proxy)
    const handles = ['AlHadath', 'AsharqNewsBrk', 'alrougui', 'AlArabiya_Brk', 'SkyNewsArabia_B', 'RT_Arabic', 'alekhbariyabrk', 'ajmubasher', 'NewsNow4USA'];
    for (const handle of handles) {
        try {
            console.log(`📡 [Syndication] Trying @${handle}...`);
            const html = stealthFetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`, { 'Referer': 'https://platform.twitter.com/' });
            const dataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (dataMatch) {
                const data = JSON.parse(dataMatch[1]);
                const tweets = data.props.pageProps.timeline.entries;
                const items = tweets.map(entry => {
                    const t = entry.content.tweet;
                    if (!t) return null;
                    return {
                        title: t.full_text,
                        link: `https://x.com/${handle}/status/${t.id_str}`,
                        pubDate: new Date(t.created_at).toISOString(),
                        source: 'twitter',
                        sourceHandle: handle,
                        sourceName: handle,
                        image: t.entities?.media?.[0]?.media_url_https || null,
                        customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                    };
                }).filter(Boolean);
                allResults = [...allResults, ...items];
            }
        } catch (e) {
            console.log(`  ❌ @${handle} failed`);
        }
    }

    // Strategy 2: List RSS (via mirrors)
    if (allResults.length < 20) {
        const potentialBridges = [...RSSHUB_BRIDGES, ...NITTER_INSTANCES.map(i => `${i}/i/lists/${LIST_ID}/rss`)];
        for (const bridge of potentialBridges) {
            try {
                console.log(`📡 [Bridge] Trying ${bridge}...`);
                const xml = stealthFetch(bridge);
                if (xml.includes('<item>')) {
                    allResults = [...allResults, ...parseRSS(xml)];
                    if (allResults.length > 40) break;
                }
            } catch (e) {}
        }
    }

    // Merge & Save
    const combined = [...allResults, ...existingItems];
    combined.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    const seen = new Set();
    const finalItems = combined.filter(item => {
        const key = (item.title || '').substring(0, 60) + item.sourceHandle;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 200);

    if (finalItems.length > 0) {
        fs.writeFileSync(outputPath, JSON.stringify({ items: finalItems, lastUpdated: new Date().toISOString() }, null, 2));
        console.log(`✅ [Success] Generated ${finalItems.length} items.`);
    } else {
        console.log('⚠️ [Failure] No items found.');
    }
}

scrape();
