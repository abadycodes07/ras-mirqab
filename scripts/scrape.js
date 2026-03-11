/* ═══════════════════════════════════════════════
   Ras Mirqab - High-Speed Cloud Scraper (Final)
   Saves aggregated news to public/data/news-live.json
   ═══════════════════════════════════════════════ */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const crypto = require('crypto');

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
    'ajanews': 'aljazeera.png',
    'ajelnews24': 'ajelnews.jpg',
    'alarabiya_brk': 'alarabiya.png',
    'alarabiya_br': 'alarabiya.png',
    'skynewsarabia_breaking': 'skynews.png',
    'skynewsarabia_b': 'skynews.png',
    'rt_arabic': 'aljazeera.png',
    'almayadeenlive': 'aljazeera.png',
    'sabq_news': 'ajelnews.jpg',
    'alrougui': 'alrougui.jpg',
    'newsnow4usa': 'newsnow.jpg',
    'modgovksa': 'modgovksa2.png',
    'asharqnewsbrk': 'asharq.png',
    'alhadath': 'alhadath.png'
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
    console.log(`--- Racing Nitter Mirrors for List: ${TWITTER_LIST_ID} ---`);
    const shuffled = [...NITTER_INSTANCES].sort(() => Math.random() - 0.5);
    
    const race = shuffled.map(instance => {
        const url = `${instance}/i/lists/${TWITTER_LIST_ID}/rss`;
        return fetchWithTimeout(url, 15000).then(html => {
            if (html.length < 1000) throw new Error('Short');
            if (html.includes('bot') && html.includes('challenge')) throw new Error('Challenge');
            if (!html.includes('<item>')) throw new Error('No items');
            console.log(`✅ Winner Mirror: ${instance}`);
            return { html, instance };
        });
    });

    try {
        const winner = await Promise.any(race);
        return parseNitterRSS(winner.html);
    } catch (e) {
        console.error('❌ All Twitter mirrors failed.');
        return [];
    }
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

// Redundant Al Jazeera specific logic removed as it's now handled by the proxy

async function scrapeAll() {
    console.log('--- Starting Enhanced Hybrid Scrape ---');
    
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
        items: unique.slice(0, 60)
    }, null, 2));
    
    console.log(`✅ Scrape Complete: ${unique.length} items saved.`);
}

scrapeAll();
