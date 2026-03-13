/* ═══════════════════════════════════════════════
   Ras Mirqab - High-Speed Cloud Scraper (Final)
   Saves aggregated news to public/data/news-live.json
   ═══════════════════════════════════════════════ */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const crypto = require('crypto');

// Hard timeout: kill process after 5 minutes to allow for slow Apify runs
setTimeout(() => { console.log('⏰ Global timeout reached — exiting.'); process.exit(0); }, 300000);

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
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '76dd92d274msh5f9d70a356151dbp1c194djsn85d2595a1c7b';
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
        "startUrls": [{ "url": `https://x.com/i/lists/${TWITTER_LIST_ID}` }],
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

async function fetchTwitterRapidAPI() {
    console.log('[RapidAPI] 🚀 Fetching Twitter List (RapidAPI/Twttr)...');
    const url = `https://twitter241.p.rapidapi.com/list-timeline?listId=${TWITTER_LIST_ID}`;
    
    return new Promise((resolve) => {
        const req = https.get(url, {
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'twitter241.p.rapidapi.com'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    let raw = [];
                    if (parsed.result && parsed.result.timeline && parsed.result.timeline.instructions) {
                        const instructions = parsed.result.timeline.instructions;
                        const addEntries = instructions.find(i => i.type === 'TimelineAddEntries');
                        if (addEntries && addEntries.entries) {
                            raw = addEntries.entries
                                .filter(e => e.content && e.content.itemContent && e.content.itemContent.tweet_results)
                                .map(e => e.content.itemContent.tweet_results.result);
                        }
                    } else {
                        raw = parsed.result || parsed.tweets || (Array.isArray(parsed) ? parsed : []);
                    }
                    
                    const mapped = raw.map(item => {
                        const tweet = item.legacy || item;
                        const user = item.core && item.core.user_results ? item.core.user_results.result.legacy : (item.user || {});
                        let mediaUrl = null;
                        const entities = tweet.extended_entities || tweet.entities;
                        if (entities && entities.media && entities.media.length > 0) {
                            mediaUrl = entities.media[0].media_url_https;
                        }

                        return {
                            title: (tweet.full_text || tweet.text || '').substring(0, 500),
                            source: 'twitter',
                            sourceName: user.name || 'Twitter',
                            handle: user.screen_name || 'twitter',
                            pubDate: tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString(),
                            link: `https://x.com/${user.screen_name}/status/${item.rest_id || item.id_str}`,
                            hasMedia: !!mediaUrl,
                            mediaUrl: mediaUrl,
                            customAvatar: user.profile_image_url_https ? user.profile_image_url_https.replace('_normal', '_400x400') : null,
                            customName: user.name
                        };
                    });
                    resolve(mapped);
                } catch (e) {
                    console.error('[RapidAPI] ❌ Parse Failed:', e.message);
                    resolve([]);
                }
            });
        });
        req.on('error', (e) => {
            console.error('[RapidAPI] ❌ Request Failed:', e.message);
            resolve([]);
        });
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
                source: 'telegram',
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

    // 1. Fetch Twitter via RapidAPI (Primary) or Apify (Backup)
    let twitterItems = await fetchTwitterRapidAPI();
    
    if (twitterItems.length === 0 && APIFY_TOKEN) {
        console.log('[Scraper] ⚠️ RapidAPI returned 0, trying Apify fallback...');
        twitterItems = await fetchTwitterApify();
    }

    console.log(`✅ [Twitter] Total items fetched: ${twitterItems.length}`);
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
