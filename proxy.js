/* ═══════════════════════════════════════════════
   V66.1 ENGINE (RESILIENT ZERO-LAG)
   ═══════════════════════════════════════════════ */

const express = require('express');
const { exec, execSync } = require('child_process');
const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3001;

// Configuration
const LIST_ID = "2031445708524421549";
const SENTINEL_TOKEN = "RAS_SENTINEL_777";

const BROWSER_FINGERPRINTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1'
];

const AVATAR_MAP = {
    'AsharqNewsBrk': 'public/logos/asharqnewsbrk.jpg',
    'AlHadath': 'public/logos/alhadath.jpg',
    'AlArabiya_Brk': 'public/logos/alarabiya_brk.jpg',
    'SkyNewsArabia_B': 'public/logos/skynewsarabia_b.jpg',
    'RT_Arabic': 'public/logos/rt.png',
    'RTonline_ar': 'public/logos/rt.png',
    'alrougui': 'public/logos/alrougui.jpg',
    'ajmubasher': 'public/logos/ajmubasher.jpg',
    'alekhbariyaNews': 'public/logos/alekhbariyanews.jpg',
    'alekhbariyaBRK': 'public/logos/alekhbariyabrk.jpg',
    'modgovksa': 'public/logos/modgovksa.jpg',
    'NewsNow4USA': 'public/logos/newsnow4usa.jpg',
    'AJELNEWS2475': 'public/logos/ajelnews2475.jpg',
    'ajanews': 'public/logos/ajanews_new.png',
    'alhadath_brk': 'public/logos/alhadath.jpg',
    'AlArabiya': 'public/logos/alarabiya.png',
    'rt_arabic': 'public/logos/rt.png'
};

// Global State
let telegramCache = [];
let twitterCache = [];
const CACHE_FILE = path.join(__dirname, 'news_cache_v66.json');

// Load persisted cache on startup
try {
    if (fs.existsSync(CACHE_FILE)) {
        const saved = JSON.parse(fs.readFileSync(CACHE_FILE));
        telegramCache = saved.telegram || [];
        twitterCache = saved.twitter || [];
        console.log(`💾 [V66.1] Loaded persisted cache: TG(${telegramCache.length}), TW(${twitterCache.length})`);
    }
} catch(e) { console.log("❌ Cache load error:", e.message); }

function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({ telegram: telegramCache, twitter: twitterCache }));
    } catch(e) {}
}

// Write combined cache to public/news.json for frontend consumption
function writeNewsJson() {
    try {
        const combined = [...telegramCache, ...twitterCache]
            .sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 200);
        
        // V66.1 persistence guard: Do not overwrite with empty if both caches are zero
        if (combined.length === 0) {
            console.log('⚠️ [Persistence Guard] Skipping news.json update - Combined cache is empty.');
            return;
        }

        const jsonPath = path.join(__dirname, 'public', 'news.json');
        if (!fs.existsSync(path.join(__dirname, 'public'))) fs.mkdirSync(path.join(__dirname, 'public'));
        fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2));
        console.log(`💾 news.json updated: ${combined.length} items (V66.1)`);
    } catch(e) { console.log('❌ news.json write error:', e.message); }
}

// Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '5mb' }));

// Helper for Cumulative Merging
function mergeCache(existing, fresh, limit = 120) {
    const combined = [...fresh, ...existing];
    const seen = new Set();
    return combined.filter(item => {
        const key = ((item.title || '') + (item.sourceHandle || '')).toLowerCase().substring(0, 150);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, limit);
}

// Telegram Engine
const TG_AGENT = new https.Agent({ keepAlive: true, timeout: 10000 });
const TG_CHANNELS = ['ajanews', 'alhadath_brk'];

async function updateTelegram() {
    const results = await Promise.all(TG_CHANNELS.map(async handle => {
        try {
            const html = await new Promise(r => {
                https.get(`https://t.me/s/${handle}`, { agent: TG_AGENT }, res => {
                    let data = '';
                    res.on('data', d => data += d);
                    res.on('end', () => r(data));
                }).on('error', () => r(''));
            });
            if (!html) return [];
            const items = [];
            const blocks = html.split('<div class="tgme_widget_message_wrap').slice(1);
            for (const block of blocks) {
                const textM = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
                const timeM = block.match(/<time[^>]*datetime="([^"]*)"/);
                if (!textM || !timeM) continue;
                const rawText = textM[1].replace(/<[^>]+>/g, '').trim();
                const imgM = block.match(/style="background-image:url\('([^']+)'\)"/);
                items.push({
                    title: rawText, source: 'telegram', sourceHandle: handle, sourceName: handle,
                    pubDate: new Date(timeM[1]).toISOString(),
                    link: (block.match(/href="(https:\/\/t\.me\/[^"]+)"[^>]*class="[^"]*tgme_widget_message_date/) || [])[1] || `https://t.me/s/${handle}`,
                    mediaUrl: imgM?.[1] || null,
                    customAvatar: AVATAR_MAP[handle] || 'public/logos/default.png'
                });
            }
            return items;
        } catch(e) { return []; }
    }));
    const fresh = results.flat();
    if (fresh.length > 0) {
        telegramCache = mergeCache(telegramCache, fresh, 150);
        saveCache();
        writeNewsJson();
    }
}

// Twitter Engine
async function updateTwitterActive() {
    console.log('📡 [Active] Twitter cycle start (V66.1)...');
    const pythonCmd = 'python3'; // Use global python3 after nixpacks restore
    
    exec(`${pythonCmd} scripts/twitter_scraper.py`, (error, stdout, stderr) => {
        if (stderr) console.log(`🐍 [Twitter Scraper] Stderr: ${stderr.trim()}`);
        if (error) {
            console.error(`❌ [Twitter Scraper] Python Error: ${error.message}`);
            return;
        }
        try {
            const data = JSON.parse(stdout);
            if (data && data.length > 0) {
                const normalized = data.map(it => ({
                    title: it.headline_text,
                    mediaUrl: it.media_url,
                    sourceName: it.channel_name,
                    sourceHandle: it.channel_name.toLowerCase(),
                    source: 'twitter',
                    pubDate: it.timestamp,
                    customAvatar: AVATAR_MAP[it.channel_name] || 'public/logos/default.png',
                    link: `https://x.com/search?q=${encodeURIComponent(it.headline_text)}`
                }));
                twitterCache = mergeCache(twitterCache, normalized, 300);
                saveCache();
                writeNewsJson();
                console.log(`✅ [Twitter Scraper] Synced ${data.length} items. Total: ${twitterCache.length}`);
            }
        } catch (e) { console.error('❌ [Twitter Scraper] Parse Fail:', e.message); }
    });
}

// Endpoints
app.get('/api/news-v4-list', (req, res) => {
    const combined = [...telegramCache, ...twitterCache].sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.json({ items: combined });
});
app.get('/api/debug/env', (req, res) => {
    exec('env && which python3 && python3 --version', (error, stdout, stderr) => {
        res.json({ timestamp: new Date().toISOString(), stdout, stderr });
    });
});
app.get('/api/debug/twitter', (req, res) => {
    console.log('🔍 [Debug] Triggering Twitter Scraper...');
    exec(`python3 scripts/twitter_scraper.py`, (error, stdout, stderr) => {
        res.json({ timestamp: new Date().toISOString(), python_error: error?.message, stdout, stderr });
    });
});
app.get('/ping', (req, res) => res.send('pong'));

// Boot
async function startScrapers() {
    await updateTelegram();
    updateTwitterActive(); 
    setInterval(updateTelegram, 7000);
    setInterval(updateTwitterActive, 60000);
}

startScrapers().catch(console.error);
app.listen(PORT, () => console.log(`🚀 V66.1 ENGINE LIVE — Zero-Lag Pulse Engine`));
