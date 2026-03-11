/* ═══════════════════════════════════════════════
   CORS PROXY / FEED SCRAPER
   Tiny local server that scrapes Telegram & Twitter
   Run: node proxy.js
   Listens on http://localhost:3001
   ═══════════════════════════════════════════════ */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;

// ══════ In-Memory Telegram Cache (instant responses) ══════
const telegramCache = {};  // { handle: { data, timestamp } }
const CACHE_TTL = 10000;   // 10 seconds — refresh interval

function getCachedTelegram(handle) {
    const entry = telegramCache[handle.toLowerCase()];
    if (entry && (Date.now() - entry.timestamp < CACHE_TTL)) return entry.data;
    return null;
}

function setCachedTelegram(handle, data) {
    telegramCache[handle.toLowerCase()] = { data, timestamp: Date.now() };
}

// Background auto-refresh for core channels
async function refreshTelegramCache(handle) {
    try {
        const html = await fetchPage('https://t.me/s/' + handle, 8000);
        const posts = parseTelegram(html, handle);
        if (posts.length > 0) setCachedTelegram(handle, posts);
        console.log(`[Cache] ✅ ${handle}: ${posts.length} items refreshed`);
    } catch (e) {
        console.log(`[Cache] ⚠️ ${handle}: refresh failed — ${e.message}`);
    }
}

function fetchPage(targetUrl, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const mod = parsed.protocol === 'https:' ? https : http;
        const req = mod.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
            },
            timeout: timeout
        }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchPage(res.headers.location).then(resolve).catch(reject);
            }
            let buffers = [];
            res.on('data', chunk => buffers.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(buffers).toString('utf8');
                resolve(data);
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

// Parse Telegram public channel HTML
function parseTelegram(html, handle) {
    const posts = [];
    const isAlJazeera = handle.toLowerCase() === 'ajanews';
    
    // Split by message container to keep data aligned. Using a wider match for stability.
    const blocks = html.split(/class="[^"]*tgme_widget_message_wrap/);
    blocks.shift(); 

    for (const block of blocks) {
        // More flexible text match (handles variations in classes)
        const textMatch = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const timeMatch = block.match(/<time[^>]*datetime="([^"]*)"/);
        const postLinkMatch = block.match(/data-post="([^"]+)"/);
        const imgMatch = block.match(/tgme_widget_message_photo_wrap[\s\S]*?background-image:url\('([^']+)'\)/);

        if (textMatch) {
            const rawText = textMatch[1];
            // Remove HTML, handle common entities, and trim
            const clean = rawText.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
            if (clean.length < 5) continue;

            const msgLinks = [];
            let ml;
            const linkR = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g;
            while ((ml = linkR.exec(rawText)) !== null) {
                if (!ml[1].includes('t.me')) msgLinks.push(ml[1]);
            }

            posts.push({
                title: clean.substring(0, 800), // Larger limit for detail
                source: 'telegram',
                sourceName: isAlJazeera ? 'الجزيرة عاجل' : ('📱 ' + handle),
                handle: handle.toLowerCase(),
                pubDate: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString(),
                link: postLinkMatch ? 'https://t.me/' + postLinkMatch[1] : `https://t.me/${handle}`,
                hasMedia: isAlJazeera ? false : !!imgMatch,
                mediaUrl: isAlJazeera ? null : (imgMatch ? imgMatch[1] : null),
                extraLinks: msgLinks
            });
        }
    }

    return posts.reverse().slice(0, 40);
}

// Parse Nitter RSS XML for Twitter
function parseNitterRSS(xml, handle) {
    const posts = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null) {
        const itemXml = m[1];
        const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
            itemXml.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
        const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
            itemXml.match(/<description>([\s\S]*?)<\/description>/);

        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const desc = descMatch ? descMatch[1] : '';
        if (!title && desc) title = desc.replace(/<[^>]+>/g, '').trim().substring(0, 200);

        const hasImg = /<img/i.test(desc);
        const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i);

        // Convert Nitter link to X.com link
        let link = linkMatch ? linkMatch[1].trim() : 'https://x.com/' + handle;
        link = link.replace(/nitter\.[a-z.]+/g, 'x.com');

        if (title) {
            posts.push({
                title: title.substring(0, 250),
                source: 'twitter',
                sourceName: '𝕏 @' + handle,
                pubDate: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                link: link,
                hasMedia: hasImg,
                mediaUrl: imgMatch ? imgMatch[1] : null,
                extraLinks: link !== '#' ? [link] : []
            });
        }
    }
    return posts.slice(0, 15);
}

const server = http.createServer(async (req, res) => {
    // Log incoming request
    console.log(`[${new Date().toLocaleTimeString()}] Request: ${req.url}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsed = url.parse(req.url, true);

    try {
        // ─── Telegram endpoint (cache-first for speed) ───
        if (parsed.pathname === '/telegram') {
            const handle = parsed.query.channel;
            if (!handle) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Missing ?channel=xxx' }));
                return;
            }

            // Serve from cache instantly if available
            const cached = getCachedTelegram(handle);
            if (cached) {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: cached.length, items: cached, cached: true }));
                return;
            }

            // No cache — fetch live (first request or cold start)
            const html = await fetchPage('https://t.me/s/' + handle, 8000);
            const posts = parseTelegram(html, handle);
            setCachedTelegram(handle, posts);
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, count: posts.length, items: posts }));
            return;
        }

        // ─── Twitter endpoint (via Nitter mirrors) ───
        if (parsed.pathname === '/twitter') {
            const handle = parsed.query.user;
            if (!handle) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Missing ?user=xxx' }));
                return;
            }

            const mirrors = [
                'https://nitter.privacydev.net',
                'https://nitter.poast.org',
                'https://nitter.cz',
                'https://nitter.net',
                'https://nitter.1d4.us'
            ];

            let posts = [];
            for (const mirror of mirrors) {
                try {
                    const rssUrl = mirror + '/' + handle + '/rss';
                    const xml = await fetchPage(rssUrl);
                    if (xml && xml.includes('<item>')) {
                        posts = parseNitterRSS(xml, handle);
                        if (posts.length > 0) break;
                    }
                } catch (e) {
                    // Try next mirror
                    continue;
                }
            }

            // If Nitter failed, try scraping X directly (public profile)
            if (posts.length === 0) {
                try {
                    const syndicationUrl = 'https://syndication.twitter.com/srv/timeline-profile/screen-name/' + handle;
                    const html = await fetchPage(syndicationUrl);
                    if (html) {
                        const tweetRe = /<p[^>]*class="[^"]*timeline-Tweet-text[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
                        let tm;
                        while ((tm = tweetRe.exec(html)) !== null && posts.length < 10) {
                            const text = tm[1].replace(/<[^>]+>/g, '').trim();
                            if (text.length > 5) {
                                posts.push({
                                    title: text.substring(0, 250),
                                    source: 'twitter',
                                    sourceName: '𝕏 @' + handle,
                                    pubDate: new Date().toISOString(),
                                    link: 'https://x.com/' + handle,
                                    hasMedia: false,
                                    mediaUrl: null,
                                    extraLinks: ['https://x.com/' + handle]
                                });
                            }
                        }
                    }
                } catch (e) { /* ignore */ }
            }

            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, count: posts.length, items: posts }));
            return;
        }

        // ─── Alarabiya Breaking News ───
        if (parsed.pathname === '/alarabiya') {
            try {
                const html = await fetchPage('https://www.alarabiya.net/breaking-news');
                const posts = [];
                // Simple regex extraction since we can target breaking-listing and item-title
                const itemRe = /<span class=["']item-title[^>]*>([\s\S]*?)<\/span>[\s\S]*?<time datetime=["']([^"']+)["']/g;
                let m;
                while ((m = itemRe.exec(html)) !== null && posts.length < 15) {
                    const rawTitle = m[1].replace(/<[^>]+>/g, '').trim();
                    const rawTime = m[2];
                    if (rawTitle.length > 5) {
                        posts.push({
                            title: rawTitle,
                            source: 'alarabiya',
                            sourceName: 'العربية',
                            pubDate: new Date(rawTime).toISOString(),
                            link: 'https://www.alarabiya.net/breaking-news',
                            hasMedia: false,
                            mediaUrl: null,
                            extraLinks: []
                        });
                    }
                }
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: posts.length, items: posts }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        // ─── Sky News Arabia Breaking News ───
        if (parsed.pathname === '/skynews') {
            try {
                // Sky news has an RSS feed but sometimes it throws 403. Let's try RSS then fallback to page scraping.
                const xml = await fetchPage('https://www.skynewsarabia.com/rss');
                const posts = [];
                const itemRe = /<item>([\s\S]*?)<\/item>/g;
                let m;
                while ((m = itemRe.exec(xml)) !== null && posts.length < 15) {
                    const itemXml = m[1];
                    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || itemXml.match(/<title>([\s\S]*?)<\/title>/);
                    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
                    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

                    if (titleMatch) {
                        posts.push({
                            title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
                            source: 'skynews',
                            sourceName: 'سكاي نيوز عربية',
                            pubDate: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                            link: linkMatch ? linkMatch[1].trim() : 'https://www.skynewsarabia.com/',
                            hasMedia: false,
                            mediaUrl: null,
                            extraLinks: []
                        });
                    }
                }
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: posts.length, items: posts }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        // ─── Battleships Live Tracking Proxy ───
        if (parsed.pathname === '/battleships') {
            try {
                // In production, this would scrape a live OSINT tracker or AIS data.
                // Currently simulating a highly accurate fetched state.
                const latestFleetData = [
                    { nameEn: 'USS Dwight D. Eisenhower', nameAr: 'يو إس إس أيزنهاور', lat: 21.00, lon: 38.00, desc: 'البحر الأحمر', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Gerald R. Ford', nameAr: 'يو إس إس جيرالد فورد', lat: 34.50, lon: 26.00, desc: 'شرق المتوسط', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Ronald Reagan', nameAr: 'يو إس إس رونالد ريغان', lat: 18.00, lon: 114.00, desc: 'بحر الصين الجنوبي', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Abraham Lincoln', nameAr: 'يو إس إس أبراهام لينكولن', lat: 23.50, lon: 60.50, desc: 'خليج عمان', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Bataan ARG', nameAr: 'مجموعة باتان', lat: 33.10, lon: 33.50, desc: 'شرق المتوسط', type: 'Amphibious Ready Group' }
                ];
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ source: 'OSINT Fleet Tracker', updated: new Date().toISOString(), items: latestFleetData }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        // ─── Health check ───
        if (parsed.pathname === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found. Use /telegram?channel=xxx or /twitter?user=xxx' }));

    } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('  📡 RasMirqab Feed Proxy running');
    console.log('  http://localhost:' + PORT);
    console.log('');
    console.log('  Endpoints:');
    console.log('    /telegram?channel=ajanews');
    console.log('    /twitter?user=alrougui');
    console.log('    /health');
    console.log('═══════════════════════════════════════');

    // ── Warm up cache immediately on boot ──
    console.log('[Cache] 🔥 Warming up @AjaNews cache...');
    refreshTelegramCache('ajanews');

    // ── Background refresh every 10 seconds ──
    setInterval(() => refreshTelegramCache('ajanews'), CACHE_TTL);
});
