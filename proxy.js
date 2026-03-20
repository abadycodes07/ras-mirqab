/* ═══════════════════════════════════════════════
   V66.7 ENGINE (DEEP DIAGNOSTIC)
   ═══════════════════════════════════════════════ */

const express = require('express');
const { exec, execSync } = require('child_process');
const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3001;

// In-memory caches for zero-lag delivery
let telegramCache = [];
let twitterCache  = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Direct News API
app.get('/api/news', (req, res) => {
    const targetPath = path.join(__dirname, 'public', 'news.json');
    if (fs.existsSync(targetPath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.json(JSON.parse(fs.readFileSync(targetPath, 'utf8')));
    } else {
        res.status(404).json({ error: "No news cached yet" });
    }
});

// ═══════════════════════════════════════════════
// BACKGROUND WORKERS (The "One Cache" Rule)
// ═══════════════════════════════════════════════

function runWorker(workerName) {
    return new Promise((resolve) => {
        exec(`node scripts/${workerName}.js`, { 
            timeout: 90000, // 1.5 min max for premium headless
            env: { ...process.env, SCRAPEDO_API_KEY: "adb11bc4e66248e186ac5316a1d4cf83a3bf18168cf" }
        }, (error, stdout, stderr) => {
            if (stderr) console.error(`⚠️ [${workerName}] stderr: ${stderr}`);
            resolve(stdout ? stdout.trim() : null);
        });
    });
}

async function updateTwitter() {
    console.log(`📡 [Twitter] Starting PREMIUM Scraping Cycle (V75.0)...`);
    const result = await runWorker('twitter_worker');
    if (result) {
        try {
            const data = JSON.parse(result);
            if (data && data.length > 0) {
                // V75.0: Deduplicate and Prepend
                const newItems = data.map(it => ({ ...it, source: "twitter" }));
                const combined = [...newItems, ...twitterCache];
                const seen = new Set();
                twitterCache = combined.filter(it => {
                    const key = it.link || it.title;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, 100);

                console.log(`✅ [Twitter] Premium Sync Success. Cache: ${twitterCache.length}`);
                writeNewsJson();
            }
        } catch(e) { console.error(`❌ [Twitter] Parse failed: ${e.message}`); }
    }
}

async function updateTelegram() {
    console.log(`📡 [Telegram] Starting direct t.me cycle...`);
    const result = await runWorker('telegram_worker');
    if (result) {
        try {
            const data = JSON.parse(result);
            if (data && data.length > 0) {
                const newItems = data.map(it => ({ ...it, source: "telegram" }));
                const combined = [...newItems, ...telegramCache];
                const seen = new Set();
                telegramCache = combined.filter(it => {
                    const key = it.link || it.title;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, 100);

                console.log(`✅ [Telegram] Direct Sync Success. Cache: ${telegramCache.length}`);
                writeNewsJson();
            }
        } catch(e) { console.error(`❌ [Telegram] Parse failed: ${e.message}`); }
    }
}

const AR_NAMES = {
    "AlArabiya": "العربية", "AlArabiya_Brk": "العربية - عاجل",
    "AlHadath": "الحدث", "SkyNewsArabia_B": "سكاي نيوز",
    "alekhbariyaNews": "الإخبارية", "AsharqNewsBrk": "الشرق",
    "ajmubasher": "الجزيرة مباشر", "RTonline_ar": "RT العربية",
    "NewsNow4USA": "نيوز ناو", "modgovksa": "وزارة الدفاع",
    "SABQ_NEWS": "سبق", "AjelNews24": "عاجل"
};

function writeNewsJson() {
    try {
        const combined = [...telegramCache, ...twitterCache]
            .filter(it => it.title && it.title.length > 5)
            .map(it => {
                const handle = it.sourceHandle || "";
                return {
                    ...it,
                    sourceName: AR_NAMES[handle] || AR_NAMES[handle.toLowerCase()] || it.sourceName || handle
                };
            })
            .sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 200);

        if (combined.length === 0) return;

        const targetPath = path.join(__dirname, 'public', 'news.json');
        const output = {
            items: combined,
            lastUpdated: new Date().toISOString(),
            engine: "V75.0"
        };
        fs.writeFileSync(targetPath, JSON.stringify(output, null, 2));
        console.log(`💾 news.json updated: ${combined.length} items (V75.0)`);
    } catch (err) {
        console.error(`❌ [IO] Write failed: ${err.message}`);
    }
}

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════

function loadExistingCache() {
    try {
        const targetPath = path.join(__dirname, 'public', 'news.json');
        if (fs.existsSync(targetPath)) {
            const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
            const items = data.items || [];
            telegramCache = items.filter(it => it.source === 'telegram');
            twitterCache  = items.filter(it => it.source === 'twitter');
            console.log(`📡 [Boot] Cache Loaded: ${telegramCache.length} TG, ${twitterCache.length} TW.`);
        }
    } catch (e) { console.error("Cache load failed:", e.message); }
}

async function startScrapers() {
    console.log("🚀 Powering up V75.1 Engine...");
    loadExistingCache();
    
    // Initial Sync
    updateTelegram();
    updateTwitter();

    // High-Frequency Intervals
    setInterval(updateTelegram, 60 * 1000);    // 1 minute (Solid)
    setInterval(updateTwitter, 10 * 60 * 1000); // 10 minutes (Premium)
}

app.listen(PORT, () => {
    console.log(`🚀 RAS MIRQAB ULTIMATE ENGINE V75.1`);
    console.log(`📍 Serving static cache at /api/news`);
    startScrapers();
});
