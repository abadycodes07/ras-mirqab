/* ═══════════════════════════════════════════════
   CLOUD SCRAPER (Ras Mirqab)
   Saves aggregated news to public/data/news-live.json
   ═══════════════════════════════════════════════ */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../public/data/news-live.json');

// Ensure directory exists
const dir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function fetchPage(targetUrl) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const mod = parsed.protocol === 'https:' ? https : http;
        const req = mod.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 10000
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchPage(res.headers.location).then(resolve).catch(reject);
            }
            let buffers = [];
            res.on('data', chunk => buffers.push(chunk));
            res.on('end', () => resolve(Buffer.concat(buffers).toString('utf8')));
        });
        req.on('error', reject);
    });
}

function parseTelegram(html, handle) {
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
            title: clean.substring(0, 250),
            source: 'telegram',
            sourceName: '📱 ' + handle,
            pubDate: times[i] ? new Date(times[i]).toISOString() : new Date().toISOString(),
            link: links[i] || 'https://t.me/' + handle,
            hasMedia: !!imgs[i],
            mediaUrl: imgs[i] || null
        });
    }
    return posts.reverse().slice(0, 10);
}

async function scrapeAll() {
    console.log('--- Starting Cloud Scrape ---');
    const all = [];

    const sources = [
        { type: 'telegram', handle: 'SABQ_NEWS', avatar: 'public/logos/sabq.png', name: 'صحيفة سبق' },
        { type: 'telegram', handle: 'AjelNews24', avatar: 'public/logos/ajelnews.jpg', name: 'عاجل السعودية' },
        { type: 'telegram', handle: 'Alarabiya_brk', avatar: 'public/logos/alarabiya.png', name: 'العربية عاجل' },
        { type: 'telegram', handle: 'SkyNewsArabia_Breaking', avatar: 'public/logos/skynews.png', name: 'سكاي نيوز عاجل' },
        { type: 'telegram', handle: 'RT_Arabic', avatar: 'public/logos/rt.png', name: 'RT العربية' },
        { type: 'telegram', handle: 'AlMayadeenLive', avatar: 'public/logos/almayadeen.png', name: 'الميادين' },
        { type: 'telegram', handle: 'ajanews', avatar: 'public/logos/aljazeera.png', name: 'الجزيرة عاجل' },
        { type: 'twitter', handle: 'alrougui', avatar: 'public/logos/alrougui.jpg' },
        { type: 'twitter', handle: 'NewsNow4USA', avatar: 'public/logos/newsnow.jpg' },
        { type: 'twitter', handle: 'modgovksa', avatar: 'public/logos/modgovksa2.png', name: 'وزارة الدفاع السعودية' }
    ];

    for (const s of sources) {
        try {
            console.log(`Scraping ${s.type}: ${s.handle}...`);
            let items = [];
            if (s.type === 'telegram') {
                const html = await fetchPage('https://t.me/s/' + s.handle);
                items = parseTelegram(html, s.handle);
            } else {
                // For Twitter in Cloud Action, we'll try a public mirror or syndication
                const syndicationUrl = 'https://syndication.twitter.com/srv/timeline-profile/screen-name/' + s.handle;
                const html = await fetchPage(syndicationUrl);
                const tweetRe = /<p[^>]*class="[^"]*timeline-Tweet-text[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
                let tm;
                while ((tm = tweetRe.exec(html)) !== null) {
                    const text = tm[1].replace(/<[^>]+>/g, '').trim();
                    if (text.length > 10) {
                        items.push({
                            title: text.substring(0, 250),
                            source: 'twitter',
                            sourceName: '𝕏 @' + s.handle,
                            pubDate: new Date().toISOString(),
                            link: 'https://x.com/' + s.handle,
                            hasMedia: false
                        });
                    }
                }
            }
            items.forEach(it => {
                it.customAvatar = s.avatar;
                it.customName = s.name || s.handle;
                all.push(it);
            });
        } catch (e) {
            console.error(`Error scraping ${s.handle}:`, e.message);
        }
    }

    // Add Alarabiya
    try {
        console.log('Scraping Alarabiya...');
        const html = await fetchPage('https://www.alarabiya.net/breaking-news');
        const itemRe = /<span class=["']item-title[^>]*>([\s\S]*?)<\/span>[\s\S]*?<time datetime=["']([^"']+)["']/g;
        let m;
        while ((m = itemRe.exec(html)) !== null) {
            all.push({
                title: m[1].replace(/<[^>]+>/g, '').trim(),
                source: 'alarabiya',
                sourceName: 'العربية',
                pubDate: new Date(m[2]).toISOString(),
                link: 'https://www.alarabiya.net/breaking-news',
                customAvatar: 'public/logos/alarabiya.png',
                customName: 'العربية'
            });
        }
    } catch (e) { console.error('Alarabiya failed'); }

    all.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
        updated: new Date().toISOString(),
        count: all.length,
        items: all.slice(0, 50)
    }, null, 2));
    
    console.log(`Saved ${all.length} items to ${OUTPUT_FILE}`);
}

scrapeAll();
