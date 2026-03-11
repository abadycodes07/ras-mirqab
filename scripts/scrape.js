/* ═══════════════════════════════════════════════
   CLOUD SCRAPER (Ras Mirqab) - HYPER-SYNC VERSION
   Saves aggregated news to public/data/news-live.json
   ═══════════════════════════════════════════════ */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { crypto } = require('crypto');

const OUTPUT_FILE = path.join(__dirname, '../public/data/news-live.json');
const MEDIA_DIR = path.join(__dirname, '../public/data/media');

// Ensure directories exist
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const NITTER_INSTANCES = [
    'https://nitter.perennialte.ch',
    'https://nitter.privacyredirect.com',
    'https://xcancel.com',
    'https://nitter.poast.org',
    'https://nitter.hostux.net',
    'https://nitter.cz'
];

const TWITTER_LIST_ID = '2031445708524421549';

async function fetchWithTimeout(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const timer = setTimeout(() => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        }, timeout);

        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (res) => {
            clearTimeout(timer);
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = new URL(res.headers.location, url).href;
                return fetchWithTimeout(redirectUrl, timeout).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function downloadMedia(url, filename) {
    if (!url) return null;
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const finalFilename = filename + ext;
    const filePath = path.join(MEDIA_DIR, finalFilename);

    // Skip if exists
    if (fs.existsSync(filePath)) return `public/data/media/${finalFilename}`;

    try {
        const protocol = url.startsWith('https') ? https : http;
        return new Promise((resolve) => {
            protocol.get(url, (res) => {
                if (res.statusCode === 200) {
                    const stream = fs.createWriteStream(filePath);
                    res.pipe(stream);
                    stream.on('finish', () => {
                        stream.close();
                        resolve(`public/data/media/${finalFilename}`);
                    });
                } else {
                    resolve(null);
                }
            }).on('error', () => resolve(null));
        });
    } catch (e) {
        return null;
    }
}

async function scrapeTwitterList() {
    console.log('--- Racing Nitter Mirrors for Twitter List ---');
    
    // Hyper-Sync Parallel Race: Launch requests to all instances simultaneously
    const race = NITTER_INSTANCES.map(instance => {
        const url = `${instance}/i/lists/${TWITTER_LIST_ID}/rss`;
        return fetchWithTimeout(url, 8000).then(html => ({ html, instance }));
    });

    try {
        const winner = await Promise.any(race);
        console.log(`✅ Winner: ${winner.instance}`);
        return parseNitterRSS(winner.html);
    } catch (e) {
        console.error('❌ All Nitter mirrors failed');
        return [];
    }
}

function parseNitterRSS(rss) {
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;

    while ((m = itemRe.exec(rss)) !== null) {
        const content = m[1];
        const title = (content.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
        const link = (content.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
        const pubDate = (content.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
        const creator = (content.match(/<dc:creator>@?([^<]+)<\/dc:creator>/) || [])[1] || 'Twitter';
        const description = (content.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
        
        // Extract media
        const imgMatch = description.match(/<img src="([^"]+)"/);
        const mediaUrl = imgMatch ? imgMatch[1] : null;

        if (title && !title.startsWith('RT @')) {
            items.push({
                title: title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim(),
                source: 'twitter',
                sourceName: creator,
                handle: creator,
                pubDate: new Date(pubDate).toISOString(),
                link: link,
                mediaUrl: mediaUrl,
                isTwitterList: true
            });
        }
    }
    return items;
}

async function scrapeTelegram(handle, name) {
    try {
        console.log(`Scraping Telegram: ${handle}...`);
        const html = await fetchWithTimeout(`https://t.me/s/${handle}`, 10000);
        const posts = [];
        const textBlockRe = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
        const timeBlockRe = /<time[^>]*datetime="([^"]*)"/g;
        const postLinkBlockRe = /data-post="([^"]+)"/g;
        const imgBlockRe = /tgme_widget_message_photo_wrap[\s\S]*?background-image:url\('([^']+)'\)/g;

        let m;
        const texts = [], times = [], links = [], imgs = [];
        while ((m = textBlockRe.exec(html)) !== null) texts.push(m[1]);
        while ((m = timeBlockRe.exec(html)) !== null) times.push(m[1]);
        while ((m = postLinkBlockRe.exec(html)) !== null) links.push('https://t.me/' + m[1]);
        while ((m = imgBlockRe.exec(html)) !== null) imgs.push(m[1]);

        for (let i = 0; i < texts.length; i++) {
            const clean = texts[i].replace(/<[^>]+>/g, '').trim();
            if (!clean || clean.length < 5) continue;
            posts.push({
                title: clean.substring(0, 500),
                source: 'telegram',
                sourceName: name || handle,
                handle: handle,
                pubDate: times[i] ? new Date(times[i]).toISOString() : new Date().toISOString(),
                link: links[i] || `https://t.me/${handle}`,
                mediaUrl: imgs[i] || null
            });
        }
        return posts.reverse().slice(0, 10);
    } catch (e) {
        console.error(`Telegram ${handle} failed:`, e.message);
        return [];
    }
}

async function scrapeAll() {
    console.log('--- Starting Enhanced Hybrid Scrape ---');
    let allItems = [];

    // 1. Parallel Scraping
    const [twitterItems, aljazeeraItems, ajelItems, arabiyaItems] = await Promise.all([
        scrapeTwitterList(),
        scrapeTelegram('ajanews', 'الجزيرة عاجل'),
        scrapeTelegram('AjelNews24', 'عاجل السعودية'),
        scrapeTelegram('Alarabiya_brk', 'العربية عاجل')
    ]);

    allItems = [...twitterItems, ...aljazeeraItems, ...ajelItems, ...arabiyaItems];

    // 2. Media Caching & Final Processing
    console.log(`Processing ${allItems.length} items...`);
    
    const processed = [];
    for (const item of allItems) {
        // Create unique ID for caching media
        const hash = Buffer.from(item.link || item.title).toString('base64').substring(0, 12);
        
        if (item.mediaUrl) {
            console.log(`Downloading media for: ${item.sourceName}`);
            const localMedia = await downloadMedia(item.mediaUrl, `news_${hash}`);
            if (localMedia) {
                item.localMedia = localMedia;
                item.hasMedia = true;
            }
        }

        // Add custom mapping for UI
        item.customName = item.sourceName;
        item.customAvatar = `public/logos/${item.handle.toLowerCase()}.png`;
        
        processed.push(item);
    }

    // 3. Deduplication & Sorting
    const unique = Array.from(new Map(processed.map(item => [item.title + item.source, item])).values());
    unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const result = {
        updated: new Date().toISOString(),
        count: unique.length,
        items: unique.slice(0, 100)
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`✅ Saved ${unique.length} items to ${OUTPUT_FILE}`);
}

scrapeAll();
