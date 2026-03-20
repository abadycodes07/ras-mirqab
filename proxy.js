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

// Configuration
const LIST_ID = "2031445708524421549";
const SENTINEL_TOKEN = "RAS_SENTINEL_777";

// In-memory caches for zero-lag delivery
let telegramCache = [];
let twitterCache  = [];

// ═══════════════════════════════════════════════
// TG_CHANNELS for avatar recovery
// ═══════════════════════════════════════════════
const TG_CHANNELS = {
    "ajanews": { name: "الجزيرة", avatar: "AJ.png" },
    "alhadath_brk": { name: "الحدث", avatar: "ALHADATH.png" },
    "R_K_A_N_2": { name: "ركن", avatar: "RKAN.png" },
    "rtarabic_brk": { name: "RT", avatar: "RT.png" },
    "Sama_TV_Official": { name: "سما", avatar: "SAMA.png" }
};

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
// DIAGNOSTIC ENDPOINTS
// ═══════════════════════════════════════════════

app.get('/api/debug/env', (req, res) => {
    try {
        res.json({
            version: "V66.7",
            time: new Date().toISOString(),
            python: execSync('python3 --version').toString().trim(),
            pip: execSync('pip3 --version').toString().trim()
        });
    } catch (e) {
        res.json({ error: e.message });
    }
});

app.get('/api/debug/twitter', async (req, res) => {
    try {
        const { stdout, stderr } = await runScraper();
        res.json({
            timestamp: new Date().toISOString(),
            stdout: stdout,
            stderr: stderr
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════
// COLD WORKER ENGINE (Node.js Logic Only)
// ═══════════════════════════════════════════════

function runWorker(workerName) {
    return new Promise((resolve) => {
        exec(`node scripts/${workerName}.js`, { 
            timeout: 60000, // 1 min max
            env: { ...process.env, SCRAPEDO_API_KEY: "adb11bc4e66248e186ac5316a1d4cf83a3bf18168cf" }
        }, (error, stdout, stderr) => {
            if (stderr) console.error(`⚠️ [${workerName}] stderr: ${stderr}`);
            resolve(stdout ? stdout.trim() : null);
        });
    });
}

async function updateTwitter() {
    console.log(`📡 [Twitter] Starting scraper cycle (V73.1)...`);
    const result = await runWorker('twitter_worker');
    if (result) {
        try {
            const data = JSON.parse(result);
            if (data && data.length > 0) {
                // Incremental Merge + Deduplicate
                const newItems = data.map(it => ({ ...it, source: "twitter" }));
                const combined = [...newItems, ...twitterCache];
                const seen = new Set();
                twitterCache = combined.filter(it => {
                    const key = it.link || it.title;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, 100);

                console.log(`✅ [Twitter] Synced. Cache size: ${twitterCache.length}. Latest: ${twitterCache[0].link}`);
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

                console.log(`✅ [Telegram] Synced. Cache size: ${telegramCache.length}`);
                writeNewsJson();
            }
        } catch(e) { console.error(`❌ [Telegram] Parse failed: ${e.message}`); }
    }
}

const AR_NAMES = {
    "AlArabiya": "العربية",
    "AlArabiya_Brk": "العربية - عاجل",
    "AlHadath": "الحدث",
    "SkyNewsArabia_B": "سكاي نيوز",
    "alekhbariyaNews": "الإخبارية",
    "AsharqNewsBrk": "الشرق",
    "ajmubasher": "الجزيرة مباشر",
    "RTonline_ar": "RT العربية",
    "NewsNow4USA": "نيوز ناو",
    "modgovksa": "وزارة الدفاع",
    "SABQ_NEWS": "سبق",
    "AjelNews24": "عاجل"
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
            engine: "V73.1"
        };
        fs.writeFileSync(targetPath, JSON.stringify(output, null, 2));
        console.log(`💾 news.json updated: ${combined.length} items (V73.1)`);
    } catch (err) {
        console.error(`❌ [IO] Write failed: ${err.message}`);
    }
}

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════

async function startScrapers() {
    // Initial burst
    await updateTwitter();
    await updateTelegram();

    // V73.1: High-Frequency Cycles
    setInterval(updateTelegram, 20 * 1000);    // 20 seconds
    setInterval(updateTwitter, 120 * 1000);   // 2 minutes (Scrape-do)
}

app.listen(PORT, () => {
    console.log(`🚀 RAS MIRQAB ENGINE V70 (Railway Ready)`);
    console.log(`📍 Port: ${PORT} | Scrapers Active`);
    startScrapers();
});
