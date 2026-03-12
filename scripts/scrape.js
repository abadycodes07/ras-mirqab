/* ═══════════════════════════════════════════════
   Ras Mirqab - High-Speed Cloud Scraper (Final)
   Saves aggregated news to public/data/news-live.json
   ═══════════════════════════════════════════════ */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const crypto = require('crypto');

// Hard timeout: kill process after 2.5 minutes to prevent hanging GitHub Actions
setTimeout(() => { console.log('⏰ Global timeout reached — exiting.'); process.exit(0); }, 150000);

const OUTPUT_FILE = path.join(__dirname, '../public/data/news-live.json');
const MEDIA_DIR = path.join(__dirname, '../public/data/media');

// Ensure directories exist
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const NITTER_INSTANCES = [
    'https://nitter.perennialte.ch',
    'https://xcancel.com',
    'https://nitter.unixfox.eu',
    'https://nitter.poast.org',
    'https://nitter.cz'
];

const TWITTER_LIST_ID = '2031445708524421549';

const LOGO_MAP = {
    // Telegram
    'ajanews': 'aljazeera.png',
    // Twitter list members (all 12)
    'alarabiya_brk': 'alarabiya.png',
    'alarabiya_br': 'alarabiya.png',
    'alhadath': 'alhadath.png',
    'asharqnewsbrk': 'asharq.png',
    'newsnow4usa': 'newsnow.jpg',
    'rtonline_ar': 'rt.png',
    'skynewsarabia_b': 'skynews.png',
    'skynewsarabia_breaking': 'skynews.png',
    'ajmubasher': 'aljazeera.png',
    'alekhbariyabrk': 'alekhbariya.png',
    'alekhbariyanews': 'alekhbariya.png',
    'alrougui': 'alrougui.jpg',
    'kbsalsaud': 'kbsalsaud.png',
    'modgovksa': 'modgovksa2.png',
    'sabq_news': 'ajelnews.jpg',
    'ajelnews24': 'ajelnews.jpg'
};

async function fetchWithTimeout(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const timer = setTimeout(() => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        }, timeout);

        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
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
    try {
        const finalFilename = filename + '.jpg';
        const filePath = path.join(MEDIA_DIR, finalFilename);

        if (fs.existsSync(filePath)) return `public/data/media/${finalFilename}`;

        let targetUrl = url;
        // Optimization: Convert Nitter media URLs to direct Twitter CDN
        if (url.includes('/pic/media') || url.includes('/pic/amplify_video_thumb') || url.includes('/pic/card_img')) {
            const match = url.match(/\/pic\/(?:media|amplify_video_thumb|card_img)(?:%2F|\/)([^.?%& ]+)/);
            if (match && match[1]) {
                targetUrl = `https://pbs.twimg.com/media/${match[1]}?format=jpg&name=small`;
            } else if (url.startsWith('//')) {
                targetUrl = 'https:' + url;
            }
        }

        const protocol = targetUrl.startsWith('https') ? https : http;
        
        return new Promise((resolve) => {
            const options = {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                },
                timeout: 10000
            };
            const req = protocol.get(targetUrl, options, (res) => {
                if (res.statusCode === 200) {
                    const stream = fs.createWriteStream(filePath);
                    res.pipe(stream);
                    stream.on('finish', () => {
                        stream.close();
                        resolve(`public/data/media/${finalFilename}`);
                    });
                } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    downloadMedia(res.headers.location, filename).then(resolve);
                } else {
                    console.error(`[Download] Failed (${res.statusCode}): ${targetUrl.substring(0, 80)}`);
                    resolve(null);
                }
            });
            req.on('error', (err) => {
                console.error(`[Download] Error: ${err.message}`);
                resolve(null);
            });
            req.setTimeout(10000, () => { req.destroy(); resolve(null); });
        });
    } catch (e) {
        console.error(`[Download] Exception: ${e.message}`);
        return null;
    }
}

async function scrapeTwitterList() {
    console.log(`--- Fetching ALL Nitter Mirrors for List: ${TWITTER_LIST_ID} ---`);
    
    // Fetch from ALL mirrors in parallel — merge everything for max coverage
    const fetches = NITTER_INSTANCES.map(async (instance) => {
        try {
            const url = `${instance}/i/lists/${TWITTER_LIST_ID}/rss`;
            const html = await fetchWithTimeout(url, 15000);
            if (html.length < 1000 || !html.includes('<item>')) return [];
            if (html.includes('bot') && html.includes('challenge')) return [];
            const items = parseNitterRSS(html);
            console.log(`✅ ${instance}: ${items.length} tweets`);
            return items;
        } catch (e) {
            console.log(`⚠️ ${instance}: failed — ${e.message}`);
            return [];
        }
    });

    const allResults = await Promise.all(fetches);
    const merged = allResults.flat();
    
    // Deduplicate by tweet GUID (status ID from link)
    const seen = new Map();
    for (const item of merged) {
        const id = item.link.match(/status\/(\d+)/)?.[1] || item.title;
        if (!seen.has(id)) seen.set(id, item);
    }
    
    const unique = Array.from(seen.values());
    console.log(`📊 Total unique tweets: ${unique.length} (from ${merged.length} raw)`);
    return unique;
}

function parseNitterRSS(rss) {
    const items = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(rss)) !== null) {
        const content = m[1];
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
        const dateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const creatorMatch = content.match(/<dc:creator>@?([^<]+)<\/dc:creator>/);
        const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);
        
        if (!titleMatch) continue;
        
        let title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const description = descMatch ? descMatch[1] : '';
        const imgMatch = description.match(/<img[^>]+src="([^"]+)"/i);
        
        const handle = creatorMatch ? creatorMatch[1].toLowerCase().replace(/@/g, '') : 'twitter';

        if (!title.startsWith('RT @')) {
            items.push({
                title: title.replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
                source: 'twitter',
                sourceName: creatorMatch ? creatorMatch[1] : 'Twitter',
                handle: handle,
                pubDate: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                link: linkMatch ? linkMatch[1] : '',
                mediaUrl: imgMatch ? imgMatch[1] : null 
            });
        }
    }
    return items;
}

async function scrapeAll() {
    console.log('--- Starting Twitter-Only Scrape ---');
    
    const results = await Promise.all([
        scrapeTwitterList()
    ]);

    const allItems = results.flat();
    
    const processed = [];
    for (const item of allItems) {
        // Use MD5 of link for stable unique filenames
        const hash = crypto.createHash('md5').update(item.link || item.title).digest('hex');
        
        if (item.mediaUrl) {
            item.localMedia = await downloadMedia(item.mediaUrl, `news_${hash}`);
        }
        
        const logoFile = LOGO_MAP[item.handle];
        item.customAvatar = logoFile ? `public/logos/${logoFile}` : `public/logos/aljazeera.png`;
        item.customName = item.sourceName;
        processed.push(item);
    }

    const unique = Array.from(new Map(processed.map(item => [item.title + item.source, item])).values());
    unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
        updated: new Date().toISOString(),
        count: unique.length,
        items: unique.slice(0, 120)
    }, null, 2));
    
    console.log(`✅ Scrape Complete: ${unique.length} items saved.`);
}

scrapeAll();
