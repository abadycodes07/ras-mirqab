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

const LIST_MEMBERS = [
    { handle: 'AJABreaking', name: 'الجزيرة عاجل', telegram: 'ajanews' },
    { handle: 'Alhadath_Brk', name: 'الحدث عاجل', telegram: 'AlHadath_Brk' }
];

const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const TWITTER_LIST_ID = '2031445708524421549';

const NITTER_MIRRORS = [
    'https://nitter.privacyredirect.com',
    'https://nitter.net',
    'https://xcancel.com',
    'https://nitter.poast.org'
];

let mirrorIdx = 0;
function getMirror() { return NITTER_MIRRORS[mirrorIdx % NITTER_MIRRORS.length]; }

async function fetchWithTimeout(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const timer = setTimeout(() => { req.destroy(); reject(new Error('timeout')); }, timeout);
        const req = protocol.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        }, (res) => {
            clearTimeout(timer);
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchWithTimeout(new URL(res.headers.location, url).href, timeout).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', e => { clearTimeout(timer); reject(e); });
    });
}

async function fetchTwitterApify() {
    console.log('[Apify] 🚀 Fetching Twitter List...');
    const url = `https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
    const payload = JSON.stringify({
        "listIds": [TWITTER_LIST_ID],
        "maxItems": 40
    });

    return new Promise((resolve) => {
        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const items = JSON.parse(data);
                    if (!Array.isArray(items)) return resolve([]);
                    const mapped = items.map(it => {
                        const author = it.author || {};
                        return {
                            title: (it.text || it.full_text || '').substring(0, 500),
                            source: 'twitter',
                            sourceName: author.name || 'Twitter',
                            handle: author.userName || 'twitter',
                            pubDate: it.createdAt ? new Date(it.createdAt).toISOString() : new Date().toISOString(),
                            link: it.url || '#',
                            hasMedia: !!(it.media && it.media[0]),
                            mediaUrl: it.media ? it.media[0] : null
                        };
                    });
                    resolve(mapped);
                } catch (e) { resolve([]); }
            });
        });
        req.on('error', () => resolve([]));
        req.write(payload);
        req.end();
    });
}

function parseTelegram(html, handle) {
    const posts = [];
    const blocks = html.split(/class="[^"]*tgme_widget_message_wrap/);
    blocks.shift();
    for (const block of blocks) {
        const textMatch = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const timeMatch = block.match(/<time[^>]*datetime="([^"]*)"/);
        const postLinkMatch = block.match(/data-post="([^"]+)"/);
        const imgMatch = block.match(/tgme_widget_message_photo_wrap[\s\S]*?background-image:url\('([^']+)'\)/);
        if (textMatch) {
            const clean = textMatch[1].replace(/<[^>]+>/g, '').trim();
            if (clean.length < 5) continue;
            posts.push({
                title: clean.substring(0, 500),
                source: 'twitter',
                handle: handle.toLowerCase(),
                pubDate: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString(),
                link: postLinkMatch ? 'https://t.me/' + postLinkMatch[1] : `https://t.me/${handle}`,
                hasMedia: !!imgMatch,
                mediaUrl: imgMatch ? imgMatch[1] : null
            });
        }
    }
    return posts;
}

function parseRSS(xml, member) {
    const items = [];
    const entryRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = entryRe.exec(xml)) !== null) {
        const block = m[1];
        const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || block.match(/<title>([\s\S]*?)<\/title>/);
        const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);
        if (titleMatch) {
            let text = titleMatch[1].replace(/<[^>]+>/g, '').trim();
            if (text.includes(': ')) text = text.split(': ').slice(1).join(': ');
            let mediaUrl = null;
            if (descMatch) {
                const imgM = descMatch[1].match(/<img[^>]+src="([^"]+)"/i);
                if (imgM) mediaUrl = imgM[1].replace(/nitter\.[a-z.]+/g, 'x.com');
            }
            items.push({
                title: text.substring(0, 500),
                source: 'twitter',
                sourceName: member.name,
                handle: member.handle.toLowerCase(),
                pubDate: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                link: linkMatch ? linkMatch[1].replace(/nitter\.[a-z.]+/g, 'x.com') : '#',
                hasMedia: !!mediaUrl,
                mediaUrl: mediaUrl
            });
        }
    }
    return items;
}

async function scrapeAll() {
    console.log('--- Multi-Source Scrape Start ---');
    const allItems = [];
    const seen = new Set();

    // 1. Fetch Twitter via Apify
    const twitterItems = await fetchTwitterApify();
    twitterItems.forEach(it => {
        const hash = (it.title.substring(0, 100) + it.pubDate).replace(/\s/g, '');
        if (!seen.has(hash)) {
            seen.add(hash);
            allItems.push(it);
        }
    });

    // 2. Original Telegram Scraper Logic
    for (const member of LIST_MEMBERS) {
        let memberItems = [];
        // 1. Try Telegram
        if (member.telegram) {
            try {
                const html = await fetchWithTimeout(`https://t.me/s/${member.telegram}`);
                memberItems = parseTelegram(html, member.telegram);
                if (memberItems.length > 0) console.log(`✅ [Telegram] @${member.handle}: ${memberItems.length}`);
            } catch (e) { }
        }
        // 2. Fallback to Nitter
        if (memberItems.length === 0) {
            const mirror = getMirror();
            try {
                const xml = await fetchWithTimeout(`${mirror}/${member.handle}/rss`);
                memberItems = parseRSS(xml, member);
                console.log(`✅ [Nitter] @${member.handle}: ${memberItems.length}`);
            } catch (e) {
                console.log(`❌ [Nitter] @${member.handle} failed on ${mirror}`);
                mirrorIdx++;
            }
        }

        for (const it of memberItems) {
            const hash = (it.title.substring(0, 100) + it.pubDate).replace(/\s/g, '');
            if (!seen.has(hash)) {
                seen.add(hash);
                allItems.push({ ...it, sourceName: member.name });
            }
        }
    }

    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
        updated: new Date().toISOString(),
        count: allItems.length,
        items: allItems.slice(0, 120)
    }, null, 2));
    console.log(`✅ Complete: ${allItems.length} items saved.`);
}

scrapeAll();
