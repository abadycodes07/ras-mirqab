const fs = require('fs');
const path = require('path');

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
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

const AVATAR_MAP = {
    'AsharqNewsBrk': 'public/logos/asharq2.jpg',
    'AlHadath': 'public/logos/alhadath3.png',
    'NewsNow4USA': 'public/logos/newsnow.jpg',
    'modgovksa': 'public/logos/modgovksa2.png',
    'alrougui': 'public/logos/alrougui.jpg',
    'alekhbariyaNews': 'public/logos/alekhbariya.jpg',
    'araReuters': 'https://www.reuters.com/pf/resources/images/reuters/favicon.ico',
    'RTonline_ar': 'public/logos/rt.png',
    'AlGhadTV': 'public/logos/aljazeera.png',
    'AlArabiya_Brk': 'public/logos/alarabiya.png',
    'SkyNewsArabia_B': 'public/logos/skynews.png',
    'SABQ_NEWS': 'public/logos/sabq.png',
    'AjelNews24': 'public/logos/ajelnews.jpg',
    'Alarabiya_brk': 'public/logos/alarabiya.png',
    'SkyNewsArabia_Breaking': 'public/logos/skynews.png',
    'RT_Arabic': 'public/logos/rt.png',
    'alekhbariyabrk': 'public/logos/alekhbariya.jpg',
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

/**
 * Enhanced fetcher with rotation and stealth
 */
async function stealthFetch(url, customHeaders = {}) {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const headers = {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...customHeaders
    };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } catch (e) {
        throw e;
    }
}

function parseListRSS(xml) {
    const items = [];
    const itemMatch = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatch) {
        const content = match[1];
        const titleMatch = content.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || content.match(/<title>([\s\S]*?)<\/title>/);
        let fullTitle = (titleMatch ? titleMatch[1] : "").trim();
        const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
        let link = linkMatch ? linkMatch[1] : "";
        const creatorMatch = content.match(/<dc:creator>@?([\w_]+)<\/dc:creator>/);
        let handle = creatorMatch ? creatorMatch[1] : "";
        if (!handle) {
            const pathMatch = link.match(/\.com\/([^\/]+)\/status/) || link.match(/nitter\.[^\/]+\/([^\/]+)\/status/);
            if (pathMatch) handle = pathMatch[1];
        }
        if (!handle) handle = "News";
        const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        let pubDate = pubDateMatch ? pubDateMatch[1] : "";
        const descMatch = content.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || content.match(/<description>([\s\S]*?)<\/description>/);
        const desc = descMatch ? descMatch[1] : "";
        const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i);
        let mediaUrl = imgMatch ? imgMatch[1] : null;
        if (mediaUrl && mediaUrl.startsWith('/')) {
            const mirrorBase = link.match(/^(https?:\/\/[^\/]+)/)?.[1];
            if (mirrorBase) mediaUrl = mirrorBase + mediaUrl;
        }
        link = link.replace(/nitter\.[a-z.]+/g, 'x.com');
        if (fullTitle && pubDate) {
            items.push({
                title: fullTitle.replace(/<[^>]+>/g, '').trim(),
                link: link,
                pubDate: new Date(pubDate).toISOString(),
                source: 'twitter',
                sourceName: handle,
                sourceHandle: handle,
                image: mediaUrl,
                customAvatar: AVATAR_MAP[handle] || AVATAR_MAP[handle.toLowerCase()] || 'public/logos/default.png'
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
            const time = timeMatch ? timeMatch[1] : null;
            const photoMatch = msgHtml.match(/tgme_widget_message_photo_wrap[^>]*style="background-image:url\('([^']+)'\)"/i) || msgHtml.match(/<img[^>]+src="([^"]+)"/i);
            const mediaUrl = photoMatch ? photoMatch[1] : null;

            if (text && time) {
                results.push({
                    title: text.substring(0, 500),
                    source: 'telegram',
                    sourceName: handle,
                    sourceHandle: handle,
                    pubDate: new Date(time).toISOString(),
                    link: `https://t.me/s/${handle}`,
                    image: (handle === 'ajanews' || handle === 'alhadath_brk') ? AVATAR_MAP[handle] : mediaUrl,
                    customAvatar: AVATAR_MAP[handle] || AVATAR_MAP[handle.toLowerCase()] || 'public/logos/default.png'
                });
            }
        }
        return results.reverse().slice(0, 15);
    } catch (e) {
        console.error(`Telegram fetch failed for ${handle}: ${e.message}`);
        return [];
    }
}

async function scrape() {
    const tgHandles = ['ajanews', 'alhadath_brk', 'AlArabiya', 'asharqnewsbrk', 'alekhbariyanews', 'rt_arabic'];
    
    console.log('🔄 Starting Scrape...');
    const tgPromises = tgHandles.map(h => fetchTelegram(h));
    
    const fetchTwitter = async () => {
        const shuffledBridges = [...RSSHUB_BRIDGES].sort(() => Math.random() - 0.5);
        const shuffledNitter = [...NITTER_INSTANCES].sort(() => Math.random() - 0.5);

        for (const bridge of shuffledBridges) {
            try {
                console.log(`📡 Trying RSSHub: ${bridge}`);
                const xml = await stealthFetch(`${bridge}/twitter/list/${LIST_ID}`);
                if (xml.includes('<item>')) return parseListRSS(xml);
            } catch (e) {}
        }
        for (const instance of shuffledNitter) {
            try {
                console.log(`📡 Trying Nitter: ${instance}`);
                const xml = await stealthFetch(`${instance}/i/lists/${LIST_ID}/rss`);
                if (xml.includes('<item>')) return parseListRSS(xml);
            } catch (e) {}
        }
        return [];
    };

    const [tgResults, twitterResults] = await Promise.all([
        Promise.all(tgPromises),
        fetchTwitter()
    ]);

    const combined = [...tgResults.flat(), ...twitterResults];
    combined.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const seen = new Set();
    const finalItems = combined.filter(item => {
        const key = item.title.substring(0, 60) + (item.sourceHandle || 'news');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 100);

    const outputPath = path.join(process.cwd(), 'public', 'news.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify({ items: finalItems, lastUpdated: new Date().toISOString() }, null, 2));
    console.log(`✅ Successfully saved ${finalItems.length} items to ${outputPath}`);
}

scrape().catch(err => {
    console.error('❌ Scrape failed:', err);
    process.exit(1);
});
