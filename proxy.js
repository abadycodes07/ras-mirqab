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
    console.log(`📡 [Twitter] Starting scraper cycle...`);
    const result = await runWorker('twitter_worker');
    if (result) {
        try {
            const data = JSON.parse(result);
            if (data && data.length > 0) {
                twitterCache = data.map(it => ({ ...it, source: "twitter" }));
                console.log(`✅ [Twitter] Synced ${twitterCache.length} items`);
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
                telegramCache = data.map(it => ({ ...it, source: "telegram" }));
                console.log(`✅ [Telegram] Synced ${telegramCache.length} items (Instant)`);
                writeNewsJson();
            }
        } catch(e) { console.error(`❌ [Telegram] Parse failed: ${e.message}`); }
    }
}

function writeNewsJson() {
    try {
        const combined = [...telegramCache, ...twitterCache]
            .filter(it => it.title && it.title.length > 5)
            .sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 200);

        if (combined.length === 0) return;

        const targetPath = path.join(__dirname, 'public', 'news.json');
        const output = {
            items: combined,
            lastUpdated: new Date().toISOString(),
            engine: "V70"
        };
        fs.writeFileSync(targetPath, JSON.stringify(output, null, 2));
        console.log(`💾 news.json updated: ${combined.length} items (V70)`);
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
    updateTwitter();

    // V71.1: High-Frequency Cycles
    setInterval(updateTelegram, 20 * 1000);    // 20 seconds (Direct)
    setInterval(updateTwitter, 5 * 60 * 1000); // 5 minutes (Scrape-do)
}

app.listen(PORT, () => {
    console.log(`🚀 RAS MIRQAB ENGINE V70 (Railway Ready)`);
    console.log(`📍 Port: ${PORT} | Scrapers Active`);
    startScrapers();
});
