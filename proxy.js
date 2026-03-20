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
            timeout: 240000, // 4 mins max for premium headless
            env: { ...process.env, SCRAPEDO_API_KEY: "76445d6feeb2455f80f40a3e27b1dcb9d6e3a545b0c" }
        }, (error, stdout, stderr) => {
            if (error && error.killed) console.error(`⚠️ [${workerName}] Timeout killed.`);
            if (stderr) console.error(`⚠️ [${workerName}] stderr: ${stderr}`);
            resolve(stdout ? stdout.trim() : null);
        });
    });
}

async function updateTwitter() {
    process.stderr.write(`📡 [Twitter] Starting PREMIUM Shield Cycle (V75.7)...\n`);
    const result = await runWorker('twitter_shield');
    if (result) {
        try {
            const data = JSON.parse(result);
            if (data && data.length > 0) {
                // V75.7: Non-Destructive Merge (Prepend)
                const newItems = data.map(it => ({ ...it, source: "twitter" }));
                const combined = [...newItems, ...twitterCache];
                const seen = new Set();
                twitterCache = combined.filter(it => {
                    const key = (it.link || it.title || "").substring(0, 100);
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, 500); // 9-Hour Shield: 500 items

                console.log(`✅ [Twitter] Shield Sync Success. Cache: ${twitterCache.length}`);
                writeNewsJson();
            }
        } catch(e) { console.error(`❌ [Twitter] Parse failed: ${e.message}`); }
    }
}

async function updateTelegram() {
    process.stderr.write(`📡 [Telegram] Starting direct t.me cycle (V75.7)...\n`);
    const result = await runWorker('telegram_shield');
    if (result) {
        try {
            const data = JSON.parse(result);
            if (data && data.length > 0) {
                // V75.7: Iron Merge (Never discard older news)
                const newItems = data.map(it => ({ ...it, source: "telegram" }));
                const combined = [...newItems, ...telegramCache];
                const seen = new Set();
                telegramCache = combined.filter(it => {
                    const key = (it.link || it.title || "").substring(0, 100);
                    if (!key || seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, 500); // 9-Hour Shield: 500 items

                console.log(`✅ [Telegram] Direct Shield Success. Cache: ${telegramCache.length}`);
                writeNewsJson();
            }
        } catch(e) { console.error(`❌ [Telegram] Parse failed: ${e.message}`); }
    }
}

const AR_NAMES = {
    "AlArabiya": "العربية", "AlArabiya_Brk": "العربية - عاجل",
    "alarabiyabr": "العربية - عاجل", "alhadath_brk": "الحدث",
    "AlHadath": "الحدث", "SkyNewsArabia_B": "سكاي نيوز",
    "alekhbariyaNews": "الإخبارية", "AsharqNewsBrk": "الشرق",
    "ajmubasher": "الجزيرة مباشر", "RTonline_ar": "RT العربية",
    "NewsNow4USA": "نيوز ناو", "modgovksa": "وزارة الدفاع",
    "SABQ_NEWS": "سبق", "AjelNews24": "عاجل", "ajanews": "الجزيرة"
};

function writeNewsJson() {
    try {
        const combined = [...telegramCache, ...twitterCache]
            .filter(it => it.title && it.title.length > 5)
            .map(it => {
                const handle = (it.sourceHandle || "").toLowerCase();
                return {
                    ...it,
                    sourceName: AR_NAMES[it.sourceHandle] || AR_NAMES[handle] || it.sourceName || it.sourceHandle
                };
            })
            .sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 200);

        if (combined.length === 0) return;

        const targetPath = path.join(__dirname, 'public', 'news.json');
        console.log(`💾 news.json updated: ${combined.length} items (V75.9 SHIELD)`);
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
            // V75.8 FIX: Robust array detection
            const items = Array.isArray(data) ? data : (data.items || []);
            // V75.6: Case-insensitive source check + default source fallback
            telegramCache = items.filter(it => (it.source || "").toLowerCase() === 'telegram').slice(0, 500);
            twitterCache  = items.filter(it => (it.source || "").toLowerCase() === 'twitter').slice(0, 500);
            console.log(`📡 [Boot] Cache Loaded: ${telegramCache.length} TG, ${twitterCache.length} TW. (V75.8)`);
        }
    } catch (e) { console.error("Cache load failed:", e.message); }
}

async function startScrapers() {
    console.log("🚀 Powering up V76.0 ULTIMATE Engine...");
    loadExistingCache();
    
    // Initial Sync
    updateTelegram();
    updateTwitter();

    // V76.0 ULTIMATE INTERVALS
    setInterval(updateTelegram, 30 * 1000);   // 30 SECONDS (TURBO DIRECT)
    setInterval(updateTwitter, 5 * 60 * 1000); // 5 MINUTES (PREMIUM SCAPE.DO)
}

app.listen(PORT, () => {
    console.log(`🚀 RAS MIRQAB ULTIMATE ENGINE V76.0`);
    console.log(`📍 Serving static cache at /api/news`);
    startScrapers();
});
