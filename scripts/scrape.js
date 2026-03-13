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
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN || ''; // User can get 1,000 free credits
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '76dd92d274msh5f9d70a356151dbp1c194djsn85d2595a1c7b';
const TWITTER_LIST_ID = '2031445708524421549';

async function fetchTwitterScrapeDo() {
    if (!SCRAPEDO_TOKEN) {
        console.warn('[Scrape.do] ⚠️ SCRAPEDO_TOKEN is missing. Skipping.');
        return [];
    }
    console.log('[Scrape.do] 🚀 Fetching Twitter List via Nitter Mirror...');
    
    // Instead of x.com (hard to parse), we use Scrape.do to fetch an easier-to-parse Nitter mirror
    const mirror = getMirror();
    const targetUrl = `${mirror}/i/lists/${TWITTER_LIST_ID}/rss`;
    const apiURL = `https://api.scrape.do?token=${SCRAPEDO_TOKEN}&url=${encodeURIComponent(targetUrl)}&geo=us`;

    try {
        const xml = await fetchWithTimeout(apiURL, 30000);
        if (xml.includes('<item>')) {
            return parseRSS(xml, { name: 'Twitter List', handle: 'twitter' });
        }
        console.warn('[Scrape.do] ⚠️ RSS feed not found in response.');
        return [];
    } catch (e) {
        console.warn('[Scrape.do] ❌ Error:', e.message);
        return [];
    }
}

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
    if (!APIFY_TOKEN) {
        console.warn('[Apify] ⚠️ APIFY_TOKEN is missing. Skipping.');
        return [];
    }
    console.log(`[Apify] 🚀 Fetching... (Token starts with: ${APIFY_TOKEN.substring(0, 3)}***)`);
    
    // 1. Start the Actor Run (Async)
    const runUrl = `https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/runs?token=${APIFY_TOKEN}`;
    const payload = JSON.stringify({
        "listIds": [TWITTER_LIST_ID],
        "maxItems": 40
    });

    try {
        const runRes = await new Promise((resolve, reject) => {
            const req = https.request(runUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
                let d = ''; res.on('data', c => d += c);
                res.on('end', () => resolve(JSON.parse(d)));
            });
            req.on('error', reject);
            req.write(payload);
            req.end();
        });

        const runId = runRes.data ? runRes.data.id : null;
        const datasetId = runRes.data ? runRes.data.defaultDatasetId : null;
        if (!runId || !datasetId) {
            console.warn('[Apify] ⚠️ Failed to start run:', JSON.stringify(runRes));
            return [];
        }

        console.log(`[Apify] ⏳ Run started: ${runId}. Waiting for completion...`);

        // 2. Poll for completion (max 2 minutes)
        let status = 'RUNNING';
        const start = Date.now();
        while (status === 'RUNNING' && (Date.now() - start < 120000)) {
            await new Promise(r => setTimeout(r, 5000));
            const statRes = await fetchWithTimeout(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`);
            const statJson = JSON.parse(statRes);
            status = statJson.data ? statJson.data.status : 'FAILED';
            process.stdout.write('.'); // Progress indicator
        }
        console.log(`\n[Apify] ✅ Run finished with status: ${status}`);

        // 3. Get results from dataset
        const itemsRes = await fetchWithTimeout(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
        const items = JSON.parse(itemsRes);
        
        if (!Array.isArray(items)) return [];
        
        return items.map(it => {
            if (!it) return null;
            const author = it.author || {};
            const title = it.text || it.fullText || it.full_text || it.description || '';
            return {
                title: title.substring(0, 500),
                source: 'twitter',
                sourceName: author.name || 'Twitter',
                handle: author.userName || author.screenName || 'twitter',
                pubDate: it.createdAt ? new Date(it.createdAt).toISOString() : new Date().toISOString(),
                link: it.url || (it.id ? `https://x.com/i/status/${it.id}` : '#'),
                hasMedia: !!(it.media && it.media[0]),
                mediaUrl: (it.media && Array.isArray(it.media)) ? (typeof it.media[0] === 'string' ? it.media[0] : it.media[0].url) : null,
                customAvatar: author.profilePicture || author.profileImageUrl || author.avatar || null
            };
        }).filter(it => it && it.title.trim().length > 5);

    } catch (e) {
        console.warn('[Apify] ❌ Scrape error:', e.message);
        return [];
    }
}

async function fetchTwitterRapidAPI() {
    console.log('[RapidAPI] 🚀 Fetching Twitter List via Twitter 241...');
    if (!RAPIDAPI_KEY) {
        console.warn('[RapidAPI] ⚠️ RAPIDAPI_KEY is missing. Skipping.');
        return [];
    }

    const url = `https://twitter241.p.rapidapi.com/list-timeline?listId=${TWITTER_LIST_ID}`;
    try {
        const data = await fetchWithTimeout(url, 20000);
        const json = JSON.parse(data);
        
        // Deeply nested mapping for Twitter 241
        const instructions = json?.result?.timeline?.instructions || [];
        const timelineEntry = instructions.find(i => i.type === 'TimelineAddEntries');
        const entries = timelineEntry ? timelineEntry.entries : [];
        
        const mapped = entries.map(entry => {
            const tweet = entry?.content?.itemContent?.tweet_results?.result?.legacy;
            const author = entry?.content?.itemContent?.tweet_results?.result?.core?.user_results?.result?.legacy;
            
            if (!tweet || !tweet.full_text) return null;

            return {
                title: tweet.full_text.substring(0, 500),
                source: 'twitter',
                sourceName: author?.name || 'Twitter',
                handle: author?.screen_name || 'twitter',
                pubDate: new Date(tweet.created_at).toISOString(),
                link: `https://x.com/i/status/${tweet.id_str}`,
                hasMedia: !!(tweet.entities && tweet.entities.media),
                mediaUrl: tweet.entities?.media?.[0]?.media_url_https || null,
                customAvatar: author?.profile_image_url_https || null
            };
        }).filter(it => it && it.title.trim().length > 5);

        return mapped;
    } catch (e) {
        console.warn('[RapidAPI] ❌ Error fetching from Twitter 241:', e.message);
        return [];
    }
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
    console.log('[Network] Checking connectivity...');
    try {
        await new Promise((resolve, reject) => {
            https.get('https://google.com', (res) => resolve()).on('error', reject);
        });
        console.log('✅ [Network] Connected to internet.');
    } catch (e) {
        console.warn('⚠️ [Network] Connectivity check failed');
    }

    const allItems = [];
    const seen = new Set();

    // 1. Fetch Twitter via Scrape.do (Priority / Exclusive test)
    let twitterItems = [];
    
    if (SCRAPEDO_TOKEN) {
        console.log('[Scraper] 🛡️ Using Scrape.do as exclusive engine for this run...');
        twitterItems = await fetchTwitterScrapeDo();
    } else {
        // Fallback to other engines only if Scrape.do token is missing
        if (APIFY_TOKEN) {
            console.log('[Scraper] 🔄 Using Apify...');
            twitterItems = await fetchTwitterApify();
        }
        if (twitterItems.length === 0 && RAPIDAPI_KEY) {
            console.log('[Scraper] 🔄 Falling back to RapidAPI...');
            twitterItems = await fetchTwitterRapidAPI();
        }
    }

    console.log(`✅ [Twitter] Total items fetched: ${twitterItems.length}`);
    twitterItems.forEach(it => {
        // Use a more generic hash for Twitter as IDs can vary between providers
        const hash = (it.title.substring(0, 100) + it.pubDate).replace(/\s/g, '');
        if (!seen.has(hash)) {
            seen.add(hash);
            allItems.push(it);
        }
    });

    // 2. Direct Telegram Scraper Logic (No Nitter fallbacks)
    for (const member of LIST_MEMBERS) {
        console.log(`[Telegram] 📡 Scraping direct: @${member.telegram}...`);
        try {
            const html = await fetchWithTimeout(`https://t.me/s/${member.telegram}`);
            const memberItems = parseTelegram(html, member.telegram);
            if (memberItems.length > 0) {
                console.log(`✅ [Telegram] @${member.handle}: ${memberItems.length}`);
                for (const it of memberItems) {
                    const hash = (it.title.substring(0, 100) + it.pubDate).replace(/\s/g, '');
                    if (!seen.has(hash)) {
                        seen.add(hash);
                        allItems.push({ ...it, sourceName: member.name });
                    }
                }
            }
        } catch (e) {
            console.warn(`[Telegram] ⚠️ Failed to scrape @${member.telegram}: ${e.message}`);
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

scrapeAll().then(() => {
    process.exit(0);
}).catch(err => {
    console.warn('⚠️ Scrape ended with warning:', err.message);
    process.exit(0); // Exit 0 to prevent GitHub Action error emails
});
