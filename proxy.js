/* ═══════════════════════════════════════════════
   Ras Mirqab - Ultra Simple Telegram Scraper
   Focus: Speed & Reliability
   ═══════════════════════════════════════════════ */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');


const PORT = process.env.PORT || 3001;
const CACHE_FILE = path.join(__dirname, 'news-cache.json');

// Memory Cache & Status
let newsCache = [];
const lastLoopStatus = {};

// Apify & Scrape.do Config
const APIFY_TOKEN = process.env.APIFY_TOKEN || '';
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN || 'eea432d317304d27be0c8f9ee2090a6562f0d002379';
const TWITTER_LIST_ID = '2031445708524421549';
const NITTER_MIRRORS = [
    'https://nitter.net',
    'https://nitter.cz',
    'https://nitter.privacydev.net',
    'https://nitter.moomoo.me',
    'https://nitter.it',
    'https://nitter.bird.trom.tf',
    'https://nitter.rawbit.ninja'
];
let currentMirrorIdx = 0;

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
        let mediaType = 'image';
        let mediaUrl = null;

        const photoMatch = block.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/);
        const videoMatch = block.match(/tgme_widget_message_video_player/);
        const roundedVideoMatch = block.match(/tgme_widget_message_roundvideo/);

        if (photoMatch) mediaUrl = photoMatch[1];

        if (videoMatch || roundedVideoMatch) {
            mediaType = 'video';
            // If it's a video but we don't have a thumbnail, try to find the video preview image
            const videoThumbMatch = block.match(/tgme_widget_message_video_thumb[^>]*background-image:url\('([^']+)'\)/);
            if (videoThumbMatch && !mediaUrl) mediaUrl = videoThumbMatch[1];
        }

        if (textMatch) {
            const cleanText = textMatch[1].replace(/<[^>]+>/g, '').trim();
            if (cleanText.length < 5) return;
            items.push({
                title: cleanText, source: 'telegram', sourceName: channel.name, handle: channel.handle,
                pubDate: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString(),
                link: linkMatch ? `https://t.me/${linkMatch[1]}` : `https://t.me/s/${channel.handle}`,
                hasMedia: !!mediaUrl, mediaUrl: mediaUrl, mediaType: mediaType,
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
                            const data = t.legacy || t;
                            const id = t.id_str || t.id;
                            if (id && !seen.has(id)) {
                                // Extract Media (Image or Video Thumbnail)
                                let mediaUrl = null;
                                const entities = t.extended_entities || t.entities || data.extended_entities || data.entities;
                                if (entities && entities.media && entities.media.length > 0) {
                                    mediaUrl = entities.media[0].media_url_https || entities.media[0].media_url;
                                }

                                newsCache.unshift({
                                    title: t.full_text || t.text,
                                    source: 'twitter',
                                    sourceName: (t.user || data.user)?.name || 'تويتر',
                                    pubDate: new Date(t.created_at || data.created_at).toISOString(),
                                    link: `https://x.com/i/status/${id}`,
                                    id: id,
                                    hasMedia: !!mediaUrl,
                                    mediaUrl: mediaUrl,
                                    customAvatar: (t.user || data.user)?.profile_image_url_https || null
                                });
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
    if (!html || html.length < 500) return [];

    try {
        const $ = cheerio.load(html);
        const mirror = NITTER_MIRRORS[currentMirrorIdx] || 'https://nitter.net';

        // More robust selector: look for any div containing timeline-item
        const timelineItems = $('div[class*="timeline-item"]');

        timelineItems.each((i, el) => {
            const tweetNode = $(el);

            // 1. Basic Info
            const textContent = tweetNode.find('.tweet-content').text().trim();
            const fullname = tweetNode.find('.fullname').first().attr('title') || tweetNode.find('.fullname').first().text().trim();
            const username = tweetNode.find('.username').first().text().trim().replace('@', '');
            const tweetLink = tweetNode.find('.tweet-link').first().attr('href');
            let avatar = tweetNode.find('.avatar').first().attr('src');

            if (!tweetLink) return;

            let link = tweetLink;
            if (link.startsWith('/')) link = 'https://x.com' + link.replace('#m', '');
            const id = link.split('/').pop()?.replace('#m', '');

            if (avatar && avatar.startsWith('/')) avatar = mirror + avatar;

            // 2. Date Parsing
            const dateTitle = tweetNode.find('.tweet-date a').first().attr('title');
            let pubDate = new Date().toISOString();
            if (dateTitle) {
                // Remove special chars like middle dots
                const cleanDate = dateTitle.replace(/[·•]/g, '').trim();
                const parsed = new Date(cleanDate);
                if (!isNaN(parsed.getTime())) pubDate = parsed.toISOString();
            }

            // 3. Media Extraction (Enhanced & Verified)
            let mediaUrl = null;
            let mediaType = 'image';

            const attachments = tweetNode.find('.attachments');
            if (attachments.length > 0) {
                // Check Videos
                const videoSrc = attachments.find('video source').first().attr('src');
                const videoTag = attachments.find('video').first().attr('src');
                const rawVideo = videoSrc || videoTag;

                if (rawVideo) {
                    mediaUrl = rawVideo.startsWith('/') ? mirror + rawVideo : rawVideo;
                    mediaType = 'video';
                } else {
                    const imageTag = attachments.find('img').first().attr('src');
                    if (imageTag) {
                        mediaUrl = imageTag.startsWith('/') ? mirror + imageTag : imageTag;
                        mediaType = 'image';
                    }
                }
            }
            
            // Fallback: If still no media, check for .still-image links
            if (!mediaUrl) {
                const stillHref = tweetNode.find('.still-image').first().attr('href');
                if (stillHref) {
                    mediaUrl = stillHref.startsWith('/') ? mirror + stillHref : stillHref;
                }
            }

            // [POWER FIX] Convert to original Twitter CDN if it's a Nitter proxy link
            if (mediaUrl && mediaUrl.includes('/pic/')) {
                try {
                    const decoded = decodeURIComponent(mediaUrl);
                    const mediaPart = decoded.split('/media/')[1] || decoded.split('/media%2F')[1];
                    if (mediaPart) {
                        mediaUrl = 'https://pbs.twimg.com/media/' + mediaPart.split('?')[0].split('&')[0];
                    }
                } catch (e) {}
            }

            if (textContent || mediaUrl) {
                items.push({
                    title: textContent,
                    source: 'twitter',
                    sourceName: fullname || username || 'تويتر',
                    handle: username,
                    pubDate: pubDate,
                    link: link,
                    hasMedia: !!mediaUrl,
                    mediaUrl: mediaUrl,
                    mediaType: mediaType,
                    customAvatar: avatar || 'https://abadycodes07.github.io/ras-mirqab/public/logos/alarabiya.png',
                    id: id
                });
            }
        });
    } catch (e) {
        console.error(`[Nitter] ❌ Parse error:`, e.message);
    }

    console.log(`[Nitter] 📊 Parsed ${items.length} items using Cheerio.`);
    return items;
}


async function startScrapedoLoop() {
    console.log('[Scrape.do] 🚀 Starting Nitter layer (Nitter.net)');
    lastLoopStatus['nitter'] = { status: 'starting', type: 'scraped_nitter' };

    while (true) {
        lastLoopStatus['nitter'].lastAttempt = new Date().toISOString();
        try {
            const mirror = NITTER_MIRRORS[currentMirrorIdx];
            const targetUrl = `${mirror}/i/lists/${TWITTER_LIST_ID}`;
            const encodedUrl = encodeURIComponent(targetUrl);
            const proxyUrl = `https://api.scrape.do/?token=${SCRAPEDO_TOKEN}&url=${encodedUrl}`;

            console.log(`[Scrape.do] 📡 Fetching Nitter (Mirror: ${mirror})...`);
            const html = await fetchPage(proxyUrl);
            console.log(`[Scrape.do] 📥 Received ${html ? html.length : 0} bytes from ${mirror}`);

            if (!html || html.length < 500) {
                console.warn(`[Scrape.do] ⚠️ Mirror ${mirror} failed or blocked. Trying next mirror...`);
                currentMirrorIdx = (currentMirrorIdx + 1) % NITTER_MIRRORS.length;
                lastLoopStatus['nitter'].status = 'mirror_failed_switching';
                await new Promise(r => setTimeout(r, 5000));
                continue;
            } else {
                const freshItems = parseNitter(html);
                console.log(`[Scrape.do] 📊 Results: Found ${freshItems.length} items from ${mirror}.`);

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
                        try {
                            fs.writeFileSync(CACHE_FILE, JSON.stringify(newsCache, null, 2));
                            console.log(`[Scrape.do] ✅ Added ${added} new items and saved to cache.`);
                        } catch (err) {
                            console.error('[Scrape.do] ❌ Failed to write cache:', err.message);
                        }
                    } else {
                        console.log('[Scrape.do] ℹ️ All items already in cache.');
                    }
                } else {
                    console.warn(`[Scrape.do] ⚠️ No items parsed from ${mirror}. Mirror might be blocked or changed. Trying next...`);
                    currentMirrorIdx = (currentMirrorIdx + 1) % NITTER_MIRRORS.length;
                    lastLoopStatus['nitter'].status = 'parser_found_zero_switching';
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }
            }
        } catch (e) {
            console.error('[Scrape.do] ❌ Loop Error:', e.message);
            lastLoopStatus['nitter'].status = 'error: ' + e.message;
        }
        console.log('[Scrape.do] ⏳ Sleeping for 45s...');
        await new Promise(r => setTimeout(r, 45000));
    }
}

// Globe Sync State
let lastPOV = { lat: 25, lng: 45, altitude: 2.2 };

// Server logic
const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const pathName = (parsed.pathname || '/').toLowerCase().replace(/\/$/, '') || '/';
    console.log(`[Proxy] 📥 ${req.method} ${pathName}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    if (['/', '/index', '/health', '/debug'].includes(pathName)) {
        res.writeHead(200);
        return res.end(JSON.stringify({ status: 'ok', loops: lastLoopStatus, newsCount: newsCache.length, time: new Date().toISOString() }));
    }

    if (pathName === '/image-proxy') {
        const targetUrl = parsed.query.url;
        if (!targetUrl) { res.writeHead(400); return res.end('Missing URL'); }

        const tryFetch = async (originalUrl) => {
            let fetchUrl = originalUrl;

            // [POWER PROXY] Convert Nitter pic URLs back to original Twitter
            if (originalUrl.includes('/pic/')) {
                try {
                    const decoded = decodeURIComponent(originalUrl);
                    const mediaPart = decoded.split('/media/')[1] || decoded.split('/media%2F')[1];
                    if (mediaPart) {
                        fetchUrl = `https://pbs.twimg.com/media/${mediaPart.split('?')[0].split('&')[0]}`;
                        console.log(`[Proxy] ⚡ Converted Nitter -> Twitter: ${fetchUrl}`);
                    }
                } catch (e) { console.warn('[Proxy] URL conversion failed:', e.message); }
            }

            const isExternalMedia = fetchUrl.includes('twimg.com') ||
                fetchUrl.includes('/pic/') ||
                fetchUrl.includes('telesco.pe') ||
                fetchUrl.includes('nitter');

            if (isExternalMedia) {
                const proxyUrl = `https://api.scrape.do?token=${SCRAPEDO_TOKEN}&url=${encodeURIComponent(fetchUrl)}`;
                console.log(`[Proxy] 📡 Fetching via Scrape.do: ${fetchUrl}`);

                return new Promise((resolve) => {
                    const mod = https;
                    const proxyReq = mod.get(proxyUrl, { timeout: 15000 }, (targetRes) => {
                        if (targetRes.statusCode === 200) {
                            res.writeHead(200, {
                                'Content-Type': targetRes.headers['content-type'] || 'image/jpeg',
                                'Cache-Control': 'public, max-age=86400',
                                'Access-Control-Allow-Origin': '*'
                            });
                            targetRes.pipe(res);
                            resolve(true);
                        } else {
                            console.warn(`[Proxy] ❌ Scrape.do failed (${targetRes.statusCode}) for: ${fetchUrl}`);
                            resolve(false);
                        }
                    });
                    proxyReq.on('error', (err) => { resolve(false); });
                    proxyReq.on('timeout', () => { proxyReq.destroy(); resolve(false); });
                });
            }

            return new Promise((resolve) => {
                const mod = fetchUrl.startsWith('https') ? https : http;
                const proxyReq = mod.get(fetchUrl, { timeout: 15000 }, (targetRes) => {
                    if (targetRes.statusCode === 200) {
                        res.writeHead(200, {
                            'Content-Type': targetRes.headers['content-type'] || 'image/jpeg',
                            'Cache-Control': 'public, max-age=86400',
                            'Access-Control-Allow-Origin': '*'
                        });
                        targetRes.pipe(res);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
                proxyReq.on('error', () => resolve(false));
                proxyReq.on('timeout', () => { proxyReq.destroy(); resolve(false); });
            });
        };

        tryFetch(targetUrl).then(success => {
            if (!success) {
                res.writeHead(404);
                res.end('Proxy Fetch Failed');
            }
        });
        return;
    }

    if (pathName === '/sync') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data.pov) {
                        lastPOV = data.pov;
                        res.writeHead(200); res.end(JSON.stringify({ ok: true }));
                    } else { res.writeHead(400); res.end(JSON.stringify({ error: 'Missing POV' })); }
                } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })); }
            });
            return;
        } else {
            res.writeHead(200); return res.end(JSON.stringify({ pov: lastPOV }));
        }
    }

    if (pathName === '/wipe') {
        newsCache = []; if (fs.existsSync(CACHE_FILE)) { try { fs.unlinkSync(CACHE_FILE); } catch(e){} }
        res.writeHead(200); return res.end(JSON.stringify({ status: 'wiped' }));
    }
    if (['/news', '/telegram', '/twitter'].includes(pathName)) {
        res.writeHead(200); return res.end(JSON.stringify({ ok: true, items: newsCache }));
    }
    res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 RAS MIRQAB PROXY LIVE ON 0.0.0.0:${PORT}`);
    CHANNELS.forEach(startTelegramLoop);
    startTwitterLoop();
    startScrapedoLoop();
});
