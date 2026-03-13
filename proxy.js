/* ═══════════════════════════════════════════════
   Ras Mirqab - Ultra Simple Telegram Scraper
   Focus: Speed & Reliability
   ═══════════════════════════════════════════════ */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;
const CACHE_FILE = path.join(__dirname, 'telegram-cache.json');

// Memory Cache & Status
let newsCache = [];
const lastLoopStatus = {};

// Apify & Scrape.do Config
const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN || 'eea432d317304d27be0c8f9ee2090a6562f0d002379';
const TWITTER_LIST_ID = '2031445708524421549';
const NITTER_URL = `https://nitter.net/i/lists/${TWITTER_LIST_ID}`;

// Load existing cache
try {
    if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        newsCache = JSON.parse(raw);
        console.log(`[Init] ✅ Loaded ${newsCache.length} items from ${CACHE_FILE}`);
    } else {
        console.log(`[Init] ℹ️ Cache file not found. Starting with empty cache.`);
    }
} catch (e) { console.error('[Init] Cache load failed:', e.message); }

const CHANNELS = [
    { handle: 'ajanews', name: 'الجزيرة عاجل', interval: 10000 },
    { handle: 'alhadath_brk', name: 'الحدث عاجل', interval: 10000 },
    { handle: 'alarabiyaBr', name: 'العربية عاجل', interval: 10000 }
];

// Helper: Fetch Page with Redirect Support
function fetchPage(targetUrl, redirects = 0) {
    if (redirects > 3) return Promise.reject(new Error('Too many redirects'));
    return new Promise((resolve, reject) => {
        const mod = targetUrl.startsWith('https') ? https : http;
        const options = {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
            timeout: 10000 
        };
        const req = mod.get(targetUrl, options, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let next = res.headers.location;
                if (!next.startsWith('http')) next = new URL(next, targetUrl).href;
                return fetchPage(next, redirects + 1).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', (err) => { req.destroy(); reject(err); });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

function parseTelegram(html, channel) {
    const items = [];
    if (!html || !html.includes('tgme_widget_message')) return [];
    const AVATARS = {
        'ajanews': 'https://abadycodes07.github.io/ras-mirqab/public/logos/aljazeera.png',
        'alhadath_brk': 'https://abadycodes07.github.io/ras-mirqab/public/logos/alhadath_brk.png',
        'alarabiyaBr': 'https://abadycodes07.github.io/ras-mirqab/public/logos/alarabiya.png'
    };
    const blocks = html.split(/class="[^"]*tgme_widget_message_wrap[^"]*"/);
    blocks.shift();
    blocks.forEach(block => {
        const textMatch = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const timeMatch = block.match(/datetime="([^"]*)"/);
        const linkMatch = block.match(/data-post="([^"]+)"/);
        let mediaUrl = (channel.handle === 'alhadath_brk' || channel.handle === 'alarabiyaBr') ? AVATARS[channel.handle] : null;
        if (!mediaUrl) {
            const photoMatch = block.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/);
            if (photoMatch) mediaUrl = photoMatch[1];
        }
        if (textMatch) {
            const cleanText = textMatch[1].replace(/<[^>]+>/g, '').trim();
            if (cleanText.length < 5) return;
            items.push({
                title: cleanText, source: 'telegram', sourceName: channel.name, handle: channel.handle,
                pubDate: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString(),
                link: linkMatch ? `https://t.me/${linkMatch[1]}` : `https://t.me/s/${channel.handle}`,
                hasMedia: !!mediaUrl, mediaUrl: mediaUrl,
                customAvatar: AVATARS[channel.handle] || AVATARS['ajanews'],
                id: linkMatch ? linkMatch[1] : (cleanText.substring(0, 50) + Date.now())
            });
        }
    });
    return items.reverse();
}

async function startTelegramLoop(channel) {
    console.log(`[Telegram] Starting loop for @${channel.handle}`);
    lastLoopStatus[channel.handle] = { status: 'starting', type: 'telegram' };
    while (true) {
        lastLoopStatus[channel.handle].lastAttempt = new Date().toISOString();
        try {
            const html = await fetchPage(`https://t.me/s/${channel.handle}`);
            const freshItems = parseTelegram(html, channel);
            if (freshItems.length > 0) {
                lastLoopStatus[channel.handle].status = 'ok';
                const seen = new Set(newsCache.map(i => i.id));
                let added = 0;
                freshItems.forEach(item => { if (!seen.has(item.id)) { newsCache.unshift(item); added++; } });
                if (added > 0) {
                    newsCache.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                    newsCache = newsCache.slice(0, 100);
                    fs.writeFileSync(CACHE_FILE, JSON.stringify(newsCache, null, 2));
                    console.log(`[${channel.handle}] ✅ Added ${added} items.`);
                }
            }
        } catch (e) { console.error(`[${channel.handle}] ❌ Error:`, e.message); }
        await new Promise(r => setTimeout(r, channel.interval));
    }
}

function postJSON(targetUrl, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(targetUrl);
        const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
            let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject); req.write(JSON.stringify(body)); req.end();
    });
}

async function startTwitterLoop() {
    console.log(`[Twitter] Starting Apify loop`);
    lastLoopStatus['twitter'] = { status: 'starting', type: 'twitter' };
    if (!APIFY_TOKEN) return;
    while (true) {
        lastLoopStatus['twitter'].lastAttempt = new Date().toISOString();
        try {
            const runRes = await postJSON(`https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/runs?token=${APIFY_TOKEN}`, {
                startUrls: [{ url: `https://x.com/i/lists/${TWITTER_LIST_ID}` }], maxItems: 60, proxyConfiguration: { useApifyProxy: true }
            });
            if (runRes.data) {
                const runId = runRes.data.id;
                let finished = false;
                for (let i = 0; i < 15; i++) {
                    await new Promise(r => setTimeout(r, 10000));
                    const s = JSON.parse(await fetchPage(`https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/runs/${runId}?token=${APIFY_TOKEN}`));
                    if (s.data?.status === 'SUCCEEDED') { finished = true; break; }
                }
                if (finished) {
                    const tweets = JSON.parse(await fetchPage(`https://api.apify.com/v2/datasets/${runRes.data.defaultDatasetId}/items?token=${APIFY_TOKEN}`));
                    if (Array.isArray(tweets) && !tweets[0]?.demo) {
                        const seen = new Set(newsCache.map(i => i.id));
                        let added = 0;
                        tweets.forEach(t => {
                            const data = t.legacy || t; const id = t.id_str || t.id;
                            if (id && !seen.has(id)) {
                                newsCache.unshift({ title: t.full_text || t.text, source: 'twitter', sourceName: (t.user || data.user)?.name || 'تويتر', pubDate: new Date(t.created_at || data.created_at).toISOString(), link: `https://x.com/i/status/${id}`, id: id });
                                added++;
                            }
                        });
                        if (added > 0) { newsCache.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)); newsCache = newsCache.slice(0, 100); fs.writeFileSync(CACHE_FILE, JSON.stringify(newsCache, null, 2)); }
                    }
                }
            }
        } catch (e) { console.error(`[Twitter] ❌ Error:`, e.message); }
        await new Promise(r => setTimeout(r, 60000));
    }
}

/* ══════════════════════════════════════════════════════════════════════════════
   🟡 SCRAPE.DO NITTER FALLBACK
   ══════════════════════════════════════════════════════════════════════════════ */

function parseNitter(html) {
    const items = [];
    if (!html) return [];
    
    // Split by timeline-item to isolate each tweet
    const blocks = html.split('class="timeline-item');
    blocks.shift(); // Header part

    console.log(`[Nitter] ℹ️ parsing HTML (length: ${html.length}), found ${blocks.length} raw blocks.`);

    blocks.forEach((block, idx) => {
        try {
            // Flexible regex to handle different Nitter layouts
            const textMatch = block.match(/<div class="tweet-content[^>]*>([\s\S]*?)<\/div>/);
            const dateMatch = block.match(/class="tweet-date"[^>]*title="([^"]+)"/);
            const fullnameMatch = block.match(/class="fullname"[^>]*title="([^"]+)"/);
            const usernameMatch = block.match(/class="username"[^>]*>@?([^<]+)<\/a>/);
            const linkMatch = block.match(/class="tweet-link"[^>]*href="([^"]+)"/);
            const avatarMatch = block.match(/<img class="avatar[^"]*" src="([^"]+)"/);
            
            if (textMatch && linkMatch) {
                const handle = usernameMatch ? usernameMatch[1] : 'twitter';
                const sourceName = fullnameMatch ? fullnameMatch[1] : (usernameMatch ? usernameMatch[1] : 'تويتر');
                
                let link = linkMatch[1];
                if (link.startsWith('/')) link = 'https://x.com' + link.replace('#m', '');
                
                let avatar = avatarMatch ? avatarMatch[1] : null;
                if (avatar && avatar.startsWith('/')) avatar = 'https://nitter.net' + avatar;

                const id = link.split('/').pop();

                // Clean Nitter date string (remove the middot '·' so Date() can parse it)
                let dateStr = dateMatch ? dateMatch[1].replace('·', '').trim() : new Date().toISOString();
                let pubDate = new Date(dateStr).toISOString();

                items.push({
                    title: textMatch[1].replace(/<[^>]+>/g, '').trim(),
                    source: 'twitter',
                    sourceName: sourceName,
                    handle: handle,
                    pubDate: pubDate,
                    link: link,
                    hasMedia: block.includes('attachment image') || block.includes('media-body'),
                    customAvatar: avatar || 'https://abadycodes07.github.io/ras-mirqab/public/logos/alarabiya.png',
                    id: id
                });
            } else if (idx === 0) {
                console.log(`[Nitter] ⚠️ Block 0 parse failed. Text: ${!!textMatch}, Link: ${!!linkMatch}`);
            }
        } catch (e) {
            console.error(`[Nitter] ❌ Parse error for block ${idx}:`, e.message);
        }
    });
    return items;
}

async function startScrapedoLoop() {
    console.log('[Scrape.do] 🚀 Starting Nitter layer (Nitter.net)');
    lastLoopStatus['nitter'] = { status: 'starting', type: 'scraped_nitter' };
    
    while (true) {
        lastLoopStatus['nitter'].lastAttempt = new Date().toISOString();
        try {
            const encodedUrl = encodeURIComponent(NITTER_URL);
            const proxyUrl = `https://api.scrape.do/?token=${SCRAPEDO_TOKEN}&url=${encodedUrl}`;
            
            console.log('[Scrape.do] 📡 Fetching Nitter...');
            const html = await fetchPage(proxyUrl);
            
            if (!html || html.length < 500) {
                console.warn(`[Scrape.do] ⚠️ Received very short HTML (${html ? html.length : 0} bytes). Possibly blocked.`);
                if (html) console.log(`[Scrape.do] HTML Snippet: ${html.substring(0, 200)}`);
                lastLoopStatus['nitter'].status = 'blocked_or_short_response';
            } else {
                const freshItems = parseNitter(html);
                console.log(`[Scrape.do] 📊 Results: Found ${freshItems.length} items.`);

                if (freshItems.length > 0) {
                    const seen = new Set(newsCache.map(i => i.id));
                    let added = 0;
                    
                    freshItems.forEach(item => {
                        if (!seen.has(item.id)) {
                            newsCache.unshift(item);
                            seen.add(item.id);
                            added++;
                        }
                    });

                    lastLoopStatus['nitter'].status = 'ok';
                    lastLoopStatus['nitter'].lastCount = added;
                    
                    if (added > 0) {
                        newsCache.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                        newsCache = newsCache.slice(0, 100);
                        fs.writeFileSync(CACHE_FILE, JSON.stringify(newsCache, null, 2));
                        console.log(`[Scrape.do] ✅ Added ${added} new items.`);
                    } else {
                        console.log('[Scrape.do] ℹ️ All items already in cache.');
                    }
                } else {
                    lastLoopStatus['nitter'].status = 'parser_found_zero';
                    console.warn('[Scrape.do] ⚠️ No items parsed. Mirror might have changed layout.');
                }
            }
        } catch (e) {
            console.error('[Scrape.do] ❌ Loop Error:', e.message);
            lastLoopStatus['nitter'].status = 'error: ' + e.message;
        }
        console.log('[Scrape.do] ⏳ Sleeping for 3 mins...');
        await new Promise(r => setTimeout(r, 180000));
    }
}

// Server logic remains same...
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const parsed = url.parse(req.url, true);
    const path = (parsed.pathname || '/').toLowerCase().replace(/\/$/, '') || '/';
    if (['/', '/index', '/health', '/debug'].includes(path)) {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: 'ok', loops: lastLoopStatus, newsCount: newsCache.length, time: new Date().toISOString() }));
    }
    if (path === '/wipe') {
        newsCache = []; if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
        res.writeHead(200); return res.end(JSON.stringify({ status: 'wiped' }));
    }
    if (['/news', '/telegram', '/twitter'].includes(path)) {
        res.writeHead(200); return res.end(JSON.stringify({ ok: true, items: newsCache }));
    }
    res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🚀 RAS MIRQAB PROXY LIVE ON ${PORT}`);
    CHANNELS.forEach(startTelegramLoop);
    startTwitterLoop();
    startScrapedoLoop();
});
