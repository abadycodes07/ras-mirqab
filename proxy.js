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
    process.stderr.write(`📡 [Twitter] Starting PREMIUM Shield Cycle (V75.5)...\n`);
    const result = await runWorker('twitter_shield');
    if (result) {
        try {
            const data = JSON.parse(result);
            if (data && data.length > 0) {
                // V75.3: Deduplicate and Prepend
                const newItems = data.map(it => ({ ...it, source: "twitter" }));
                const combined = [...newItems, ...twitterCache];
                const seen = new Set();
                twitterCache = combined.filter(it => {
                    const key = it.link || it.title;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, 100);

                console.log(`✅ [Twitter] Shield Sync Success. Cache: ${twitterCache.length}`);
                writeNewsJson();
            }
        } catch(e) { console.error(`❌ [Twitter] Parse failed: ${e.message}`); }
    }
}

async function updateTelegram() {
    process.stderr.write(`📡 [Telegram] Starting direct t.me cycle (V75.5)...\n`);
    const result = await runWorker('telegram_shield');
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
        const output = {
            items: combined,
            lastUpdated: new Date().toISOString(),
            engine: "V75.5"
        };
        fs.writeFileSync(targetPath, JSON.stringify(output, null, 2));
        console.log(`💾 news.json updated: ${combined.length} items (V75.5 SUPER-SYNC)`);
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
            telegramCache = items.filter(it => it.source === 'telegram').slice(0, 100);
            twitterCache  = items.filter(it => it.source === 'twitter').slice(0, 100);
            console.log(`📡 [Boot] Cache Loaded: ${telegramCache.length} TG, ${twitterCache.length} TW.`);
        }
    } catch (e) { console.error("Cache load failed:", e.message); }
}

async function startScrapers() {
    console.log("🚀 Powering up V75.5 SUPER-SYNC Engine...");
    loadExistingCache();
    
    // Initial Sync
    updateTelegram();
    updateTwitter();

    // High-Frequency Intervals
    setInterval(updateTelegram, 60 * 1000);    // 1 minute (Solid)
    setInterval(updateTwitter, 5 * 60 * 1000); // 5 minutes (Turbo)
}

app.listen(PORT, () => {
    console.log(`🚀 RAS MIRQAB ULTIMATE ENGINE V75.5 SUPER-SYNC`);
    console.log(`📍 Serving static cache at /api/news`);
    startScrapers();
});
