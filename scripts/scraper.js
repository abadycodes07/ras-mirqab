const fs = require('fs');
const path = require('path');

// Configuration
const LIST_ID = "2031445708524421549";
const RSSHUB_BRIDGES = [
    'https://rsshub.rssforever.com',
    'https://rsshub.moeyy.cn',
    'https://rsshub.app',
    'https://rss.shab.fun'
];

const NITTER_INSTANCES = [
    'https://nitter.privacydev.net',
    'https://nitter.net',
    'https://nitter.cz',
    'https://nitter.it',
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
    'alekhbariyaNews': 'public/logos/alekhbariya.jpg',
    'RTonline_ar': 'public/logos/rt.png',
    'AlArabiya_Brk': 'public/logos/alarabiya.png',
    'SkyNewsArabia_B': 'public/logos/skynews.png',
    'RT_Arabic': 'public/logos/rt.png',
    'ajanews': 'public/logos/ajanews_new.png',
    'alhadath_brk': 'public/logos/alhadath3.png',
    'AlArabiya': 'public/logos/alarabiya.png',
    'asharqnewsbrk': 'public/logos/asharq2.jpg',
    'alekhbariyanews': 'public/logos/alekhbariya.jpg',
    'rt_arabic': 'public/logos/rt.png'
};

async function stealthFetch(url, customHeaders = {}) {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(url, { 
            headers: { 'User-Agent': ua, ...customHeaders },
            signal: controller.signal 
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (e) { throw e; }
}

function parseListRSS(xml) {
    const items = [];
    const itemMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatch) {
        const content = match[1];
        const titleMatch = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || content.match(/<title>([\s\S]*?)<\/title>/);
        let fullTitle = titleMatch ? titleMatch[1] : "";
        const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const creatorMatch = content.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
        const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);
        const imgMatch = descMatch ? descMatch[1].match(/<img[^>]+src="([^"]+)"/i) : null;
        
        if (fullTitle && pubDateMatch) {
            const handle = creatorMatch ? creatorMatch[1] : 'News';
            items.push({
                title: fullTitle.replace(/<[^>]+>/g, '').trim(),
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
    console.log('🔄 [Twitter Scraper] Running Multi-Source stability fetch...');
    const outputPath = path.join(process.cwd(), 'public', 'news.json');
    let existingItems = [];
    try {
        if (fs.existsSync(outputPath)) {
            existingItems = JSON.parse(fs.readFileSync(outputPath)).items || [];
        }
    } catch (e) {}

    const fetchTwitter = async () => {
        let results = [];
        // 1. Syndication
        for (const handle of ['alrougui', 'AlHadath', 'AsharqNewsBrk']) {
            try {
                const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${handle}`;
                const html = await stealthFetch(url, { 'Referer': 'https://platform.twitter.com/' });
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
                    results = [...results, ...items];
                }
            } catch (e) {}
        }

        // 2. RSSHub List
        for (const bridge of RSSHUB_BRIDGES) {
            try {
                const xml = await stealthFetch(`${bridge}/twitter/list/${LIST_ID}`);
                if (xml.includes('<item>')) {
                    results = [...results, ...parseListRSS(xml)];
                    if (results.length > 10) break;
                }
            } catch (e) {}
        }

        // 3. Nitter Fallback
        if (results.length < 5) {
            for (const instance of NITTER_INSTANCES) {
                try {
                    const xml = await stealthFetch(`${instance}/i/lists/${LIST_ID}/rss`);
                    if (xml.includes('<item>')) {
                        results = [...results, ...parseListRSS(xml)];
                        if (results.length > 5) break;
                    }
                } catch (e) {}
            }
        }
        return results;
    };

    try {
        const newResults = await fetchTwitter();
        console.log(`📡 Fetch finished. Found ${newResults.length} new potential items.`);

        // Merge and deduplicate
        const combined = [...newResults, ...existingItems];
        combined.sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
        
        const seen = new Set();
        const finalItems = combined.filter(item => {
            const key = (item.title || '').substring(0, 50) + item.sourceHandle;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 150);

        if (finalItems.length > 0) {
            fs.writeFileSync(outputPath, JSON.stringify({ items: finalItems, lastUpdated: new Date().toISOString() }, null, 2));
            console.log(`✅ [Twitter Scraper] Saved ${finalItems.length} items.`);
        } else {
            console.log('⚠️ [Twitter Scraper] No news found. Preserving existing file.');
        }
    } catch (err) {
        console.error('❌ [Twitter Scraper] Failed:', err.message);
    }
}

scrape();
