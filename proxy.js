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

// Helper: Fetch Page
function fetchPage(targetUrl) {
    return new Promise((resolve, reject) => {
        const mod = targetUrl.startsWith('https') ? https : http;
        const req = mod.get(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

// Simple Parser
function parseTelegram(html, channel) {
    const items = [];
    const blocks = html.split('tgme_widget_message_wrap');
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
                hasMedia: !!imgMatch && channel.handle !== 'ajanews', // AjaNews usually doesn't need images per older requests
                mediaUrl: imgMatch ? imgMatch[1] : null,
                id: linkMatch ? linkMatch[1] : (cleanText.substring(0, 50) + timeMatch)
            });
        }
    });
    return items.reverse();
}

// Loop for each channel
async function startLoop(channel) {
    console.log(`[Loop] Starting loop for @${channel.handle} (${channel.interval}ms)`);
    while (true) {
        try {
            const html = await fetchPage(`https://t.me/s/${channel.handle}`);
            const freshItems = parseTelegram(html, channel);
            
            if (freshItems.length > 0) {
                const seen = new Set(newsCache.map(i => i.id));
                let added = 0;
                
                freshItems.forEach(item => {
                    if (!seen.has(item.id)) {
                        newsCache.unshift(item);
                        added++;
                    }
                });

                if (added > 0) {
                    newsCache.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                    newsCache = newsCache.slice(0, 100);
                    fs.writeFileSync(CACHE_FILE, JSON.stringify(newsCache, null, 2));
                    console.log(`[${channel.handle}] ✅ Added ${added} new items.`);
                }
            }
        } catch (e) {
            console.error(`[${channel.handle}] ❌ Loop Error:`, e.message);
        }
        await new Promise(r => setTimeout(r, channel.interval));
    }
}

// Server
const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/news' || parsed.pathname === '/telegram') {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, count: newsCache.length, items: newsCache }));
    } else if (parsed.pathname === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Scraper Proxy live on port ${PORT}`);
    CHANNELS.forEach(startLoop);
});
