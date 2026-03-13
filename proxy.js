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

// Apify Config
const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const TWITTER_LIST_ID = '2031445708524421549';

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
            timeout: 8000 // Slightly shorter timeout to avoid hanging
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

/* ══════════════════════════════════════════════════════════════════════════════
   🔴 CORE TELEGRAM ENGINE - [LOCKED] - DO NOT MODIFY
   CRITICAL: This section is the production-ready Telegram scraping core.
   PER USER REQUEST: Do NOT change logic, intervals, or branding for ajanews,
   alhadath_brk, or alarabiyaBr. Any new sources MUST be added in the
   "FUTURE SCRAPERS" section below. This core is PROTECTED.
   ══════════════════════════════════════════════════════════════════════════════ */

// Flexible Telegram Page Parser
function parseTelegram(html, channel) {
    const items = [];
    if (!html || !html.includes('tgme_widget_message')) return [];
    
    // Use Absolute URLs to ensure they load everywhere
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
        
        let mediaUrl = null;
        if (channel.handle === 'alhadath_brk' || channel.handle === 'alarabiyaBr') {
            // FORCED: Al Hadath & Al Arabiya items ALWAYS use the logo as thumbnail
            mediaUrl = AVATARS[channel.handle];
        } else {
            // Standard media extraction for others (Al Jazeera stays as is)
            const photoMatch = block.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/);
            if (photoMatch) mediaUrl = photoMatch[1];
        }

        if (textMatch) {
            const cleanText = textMatch[1].replace(/<[^>]+>/g, '').trim();
            if (cleanText.length < 5) return;

            items.push({
                title: cleanText,
                source: 'telegram',
                sourceName: channel.name,
                handle: channel.handle,
                pubDate: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString(),
                link: linkMatch ? `https://t.me/${linkMatch[1]}` : `https://t.me/s/${channel.handle}`,
                hasMedia: (channel.handle === 'alhadath_brk' || channel.handle === 'alarabiyaBr') ? true : !!mediaUrl,
                mediaUrl: mediaUrl,
                customAvatar: AVATARS[channel.handle] || AVATARS['ajanews'],
                id: linkMatch ? linkMatch[1] : (cleanText.substring(0, 50) + (timeMatch ? timeMatch[1] : ''))
            });
        }
    });
    return items.reverse();
}

// Telegram Background Loop
async function startTelegramLoop(channel) {
    console.log(`[Telegram] Starting loop for @${channel.handle} (${channel.interval}ms)`);
    lastLoopStatus[channel.handle] = { status: 'starting', type: 'telegram' };

    while (true) {
        lastLoopStatus[channel.handle].lastAttempt = new Date().toISOString();
        try {
            const urls = [`https://t.me/s/${channel.handle}`, `https://tel.ge/s/${channel.handle}`];
            let html = '', usedUrl = '';
            
            for (const url of urls) {
                try {
                    html = await fetchPage(url);
                    if (html && html.includes('tgme_widget_message')) { usedUrl = url; break; }
                } catch (e) {}
            }

            const freshItems = parseTelegram(html, channel);
            if (freshItems.length > 0) {
                lastLoopStatus[channel.handle].status = 'ok';
                lastLoopStatus[channel.handle].lastCount = freshItems.length;
                lastLoopStatus[channel.handle].usedUrl = usedUrl;

                const seen = new Set(newsCache.map(i => i.id));
                let added = 0;
                freshItems.forEach(item => {
                    if (!seen.has(item.id)) { 
                        newsCache.unshift(item); 
                        added++; 
                    } else if (item.handle === 'alhadath_brk' || item.handle === 'alarabiyaBr') {
                        // FORCED UPDATE for Al Hadath/Al Arabiya icons on existing items in memory
                        const existing = newsCache.find(i => i.id === item.id);
                        if (existing) {
                            existing.customAvatar = item.customAvatar;
                            existing.mediaUrl = item.mediaUrl;
                        }
                    }
                });

                if (added > 0) {
                    newsCache.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                    newsCache = newsCache.slice(0, 100);
                    fs.writeFileSync(CACHE_FILE, JSON.stringify(newsCache, null, 2));
                    console.log(`[${channel.handle}] ✅ Added ${added} new items.`);
                }
            } else {
                lastLoopStatus[channel.handle].status = 'empty_response' + (html ? '_but_got_html' : '_no_html');
            }
        } catch (e) {
            console.error(`[${channel.handle}] ❌ Error:`, e.message);
            lastLoopStatus[channel.handle].status = 'error: ' + e.message;
        }
        await new Promise(r => setTimeout(r, channel.interval));
    }
}

/* ══════════════════════════════════════════════════════════════════════════════
   🟢 FUTURE SCRAPERS SECTION - Twitter (Apify Implementation)
   ══════════════════════════════════════════════════════════════════════════════ */

// Helper for Apify POST requests
function postJSON(targetUrl, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(targetUrl);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function startTwitterLoop() {
    const tokenPrefix = APIFY_TOKEN ? (APIFY_TOKEN.substring(0, 10) + '...') : 'MISSING';
    console.log(`[Twitter] Starting Apify loop (1m interval). Token: ${tokenPrefix}`);
    lastLoopStatus['twitter'] = { status: 'starting', type: 'twitter' };

    if (!APIFY_TOKEN) {
        console.warn('[Twitter] ⚠️ APIFY_TOKEN missing.');
        lastLoopStatus['twitter'].status = 'disabled: missing_token';
        return;
    }

    while (true) {
        lastLoopStatus['twitter'].lastAttempt = new Date().toISOString();
        try {
            console.log('[Twitter] 🚀 Triggering Apify Actor...');
            const runUrl = `https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/runs?token=${APIFY_TOKEN}`;
            const runRes = await postJSON(runUrl, {
                startUrls: [{ url: `https://x.com/i/lists/${TWITTER_LIST_ID.trim()}` }],
                maxItems: 60,
                proxyConfiguration: { useApifyProxy: true }
            });

            if (!runRes.data || !runRes.data.id) {
                throw new Error('Trigger failed: ' + JSON.stringify(runRes));
            }

            const runId = runRes.data.id;
            const datasetId = runRes.data.defaultDatasetId;
            console.log(`[Twitter] 🏃 Run started: ${runId}`);
            
            let finished = false;
            let attempts = 0;
            while (!finished && attempts < 15) {
                await new Promise(r => setTimeout(r, 10000));
                const statusRes = await fetchPage(`https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/runs/${runId}?token=${APIFY_TOKEN}`);
                const statusData = JSON.parse(statusRes);
                const status = statusData.data ? statusData.data.status : 'UNKNOWN';
                
                if (status === 'SUCCEEDED') finished = true;
                else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) throw new Error(`Actor ${status}`);
                attempts++;
            }

            if (finished) {
                const itemsRes = await fetchPage(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
                const tweets = JSON.parse(itemsRes);
                console.log(`[Twitter] ✨ Dataset received (${tweets.length} items).`);
                
                if (Array.isArray(tweets) && tweets.length > 0) {
                    const firstItemKeys = Object.keys(tweets[0]);
                    console.log(`[Twitter] ℹ️ First item keys: ${firstItemKeys.join(', ')}`);
                    
                    const isDemoRun = tweets[0].demo || tweets[0].is_demo || firstItemKeys.includes('demo');
                    if (isDemoRun) {
                        console.warn('═══════════════════════════════════════════════');
                        console.warn('⚠️  APIFY IS IN DEMO MODE');
                        console.warn('The current account/token is returning placeholder data.');
                        console.warn('Please check your Apify billing, credits, or plan.');
                        console.warn('═══════════════════════════════════════════════');
                    }

                    let added = 0;
                    let skippedDemo = 0;
                    let skippedCache = 0;
                    let skippedNoId = 0;
                    
                    const seen = new Set(newsCache.map(i => i.id));

                    tweets.forEach(t => {
                        const data = t.legacy || t;
                        const id = t.id_str || t.id || data.id_str || data.id;
                        
                        if (t.demo || (typeof t === 'object' && Object.keys(t).includes('demo'))) {
                            skippedDemo++;
                            return;
                        }

                        if (!id) { skippedNoId++; return; }

                        if (!seen.has(id)) {
                            const user = t.user || data.user || itemUser || {};
                            const profileImg = user.profile_image_url_https || 'https://abadycodes07.github.io/ras-mirqab/public/logos/alarabiya.png';
                            
                            newsCache.unshift({
                                title: t.full_text || t.text || data.full_text || data.text || '',
                                source: 'twitter',
                                sourceName: user.name || 'تويتر',
                                handle: user.screen_name || 'twitter',
                                pubDate: new Date(t.created_at || data.created_at || Date.now()).toISOString(),
                                link: `https://x.com/i/status/${id}`,
                                hasMedia: !!(t.entities?.media || data.entities?.media),
                                mediaUrl: t.entities?.media?.[0]?.media_url_https || data.entities?.media?.[0]?.media_url_https || null,
                                customAvatar: profileImg,
                                id: id
                            });
                            added++;
                            seen.add(id);
                        } else {
                            skippedCache++;
                        }
                    });

                    console.log(`[Twitter] 📊 Stats: Added: ${added}, Demo: ${skippedDemo}, Cached: ${skippedCache}, NoID: ${skippedNoId}`);
                    
                    if (added > 0) {
                        newsCache.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                        newsCache = newsCache.slice(0, 100);
                        fs.writeFileSync(CACHE_FILE, JSON.stringify(newsCache, null, 2));
                    }
                }
            }
        } catch (e) {
            console.error(`[Twitter] ❌ Error:`, e.message);
            lastLoopStatus['twitter'].status = 'error: ' + e.message;
        }
        await new Promise(r => setTimeout(r, 60000));
    }
}

// Server
const server = http.createServer((req, res) => {
    // CORS & JSON Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const parsed = url.parse(req.url, true);
    const rawPath = parsed.pathname || '/';
    const path = rawPath.toLowerCase().replace(/\/$/, '') || '/';

    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${path}`);

    // High Priority: Root and Debug
    if (path === '/' || path === '/index' || path === '/health' || path === '/debug') {
        res.writeHead(200);
        return res.end(JSON.stringify({ 
            status: 'ok', 
            service: 'Ras Mirqab Proxy v1.0.5-final',
            uptime: Math.floor(process.uptime()) + 's',
            memory: process.memoryUsage().rss,
            loops: lastLoopStatus,
            newsCount: newsCache.length,
            time: new Date().toISOString()
        }));
    }

    // Wipe Cache Endpoint
    if (path === '/wipe') {
        newsCache = [];
        if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
        console.log('[Server] 🧹 Cache wiped manually.');
        res.writeHead(200);
        return res.end(JSON.stringify({ status: 'wiped', items: 0 }));
    }

    // News/Telegram Endpoints
    if (path === '/news' || path === '/telegram' || path === '/twitter') {
        res.writeHead(200);
        return res.end(JSON.stringify({ 
            ok: true, 
            version: '1.0.5',
            count: newsCache.length, 
            items: newsCache 
        }));
    }

    // Default 404 with helpful debug info
    res.writeHead(404);
    res.end(JSON.stringify({ 
        error: 'Endpoint not found', 
        receivedPath: path,
        hint: 'Use /news or /debug',
        version: '1.0.5-final'
    }));
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log(` 🚀 RAS MIRQAB PROXY v1.0.4 LIVE`);
    console.log(` Port: ${PORT}`);
    console.log('═══════════════════════════════════════');
    CHANNELS.forEach(startTelegramLoop);
    startTwitterLoop();
});
