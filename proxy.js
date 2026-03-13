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

// Memory Cache
let newsCache = [];

// Load existing cache
try {
    if (fs.existsSync(CACHE_FILE)) {
        newsCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        console.log(`[Init] Loaded ${newsCache.length} items from disk.`);
    }
} catch (e) { console.error('[Init] Cache load failed:', e.message); }

const CHANNELS = [
    { handle: 'ajanews', name: 'الجزيرة عاجل', interval: 2000 },
    { handle: 'alhadath_brk', name: 'الحدث عاجل', interval: 5000 }
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
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

/* ══════════════════════════════════════════════════════════════════════════════
   🔴 CORE TELEGRAM ENGINE - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION
   This section handles ultra-fast direct polling and parsing.
   It is isolated to ensure zero-regression when adding other sources.
   ══════════════════════════════════════════════════════════════════════════════ */

// Flexible Telegram Page Parser
function parseTelegram(html, channel) {
    const items = [];
    if (!html || !html.includes('tgme_widget_message')) return [];
    
    const blocks = html.split(/class="[^"]*tgme_widget_message_wrap[^"]*"/);
    blocks.shift();

    blocks.forEach(block => {
        const textMatch = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const timeMatch = block.match(/datetime="([^"]*)"/);
        const linkMatch = block.match(/data-post="([^"]+)"/);
        const imgMatch = block.match(/background-image:url\('([^']+)'\)/);

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
                hasMedia: !!imgMatch && channel.handle !== 'ajanews',
                mediaUrl: imgMatch ? imgMatch[1] : null,
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
                    if (html.includes('tgme_widget_message')) { usedUrl = url; break; }
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
                    if (!seen.has(item.id)) { newsCache.unshift(item); added++; }
                });

                if (added > 0) {
                    newsCache.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                    newsCache = newsCache.slice(0, 100);
                    fs.writeFileSync(CACHE_FILE, JSON.stringify(newsCache, null, 2));
                    console.log(`[${channel.handle}] ✅ Added ${added} new items.`);
                }
            } else {
                lastLoopStatus[channel.handle].status = 'empty_response';
            }
        } catch (e) {
            console.error(`[${channel.handle}] ❌ Error:`, e.message);
            lastLoopStatus[channel.handle].status = 'error: ' + e.message;
        }
        await new Promise(r => setTimeout(r, channel.interval));
    }
}

/* ══════════════════════════════════════════════════════════════════════════════
   🟢 FUTURE SCRAPERS SECTION
   Add new scraping logic (RSS, X, etc.) DOWN HERE to keep Telegram logic clean.
   ══════════════════════════════════════════════════════════════════════════════ */

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
            service: 'Ras Mirqab Proxy v1.0.4-bulletproof',
            uptime: Math.floor(process.uptime()) + 's',
            memory: process.memoryUsage().rss,
            loops: lastLoopStatus,
            newsCount: newsCache.length,
            time: new Date().toISOString()
        }));
    }

    // News/Telegram Endpoints
    if (path === '/news' || path === '/telegram' || path === '/twitter') {
        res.writeHead(200);
        return res.end(JSON.stringify({ 
            ok: true, 
            version: '1.0.4',
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
        version: '1.0.4-bulletproof'
    }));
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log(` 🚀 RAS MIRQAB PROXY v1.0.4 LIVE`);
    console.log(` Port: ${PORT}`);
    console.log('═══════════════════════════════════════');
    CHANNELS.forEach(startTelegramLoop);
});
