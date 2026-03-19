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
// CORE SCRAPER ENGINE
// ═══════════════════════════════════════════════

function runScraper() {
    return new Promise((resolve) => {
        exec('python3 scripts/twitter_scraper.py', { 
            timeout: 300000, // 5 min max
            env: { ...process.env, PYTHONUNBUFFERED: "1" }
        }, (error, stdout, stderr) => {
            resolve({ stdout, stderr });
        });
    });
}

async function updateTwitter() {
    console.log(`📡 [Active] Twitter cycle start (V66.7)...`);
    const { stdout, stderr } = await runScraper();
    
    if (stderr) console.error(`🐍 [Twitter Scraper] Stderr: ${stderr}`);
    
    try {
        const fresh = JSON.parse(stdout);
        if (Array.isArray(fresh) && fresh.length > 0) {
            twitterCache = fresh.map(item => ({
                ...item,
                pubDate: item.timestamp || new Date().toISOString(),
                source: "Twitter"
            }));
            console.log(`✅ [Twitter] Synced ${twitterCache.length} items (V66.7)`);
            writeNewsJson();
        } else {
            console.warn(`⚠️ [Twitter] Scrape returned zero items or failed.`);
        }
    } catch (e) {
        console.error(`❌ [Twitter] Parse Error: ${e.message}`);
    }
}

async function updateTelegram() {
    console.log(`📡 [Active] Telegram cycle start...`);
}

function writeNewsJson() {
    try {
        // PERSISTENCE GUARD
        if (telegramCache.length === 0 && twitterCache.length === 0) {
            console.warn("🛡️ [Guard] Both caches empty. Skipping news.json update.");
            return;
        }

        const combined = [...telegramCache, ...twitterCache]
            .sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 200);

        const targetPath = path.join(__dirname, 'public', 'news.json');
        fs.writeFileSync(targetPath, JSON.stringify(combined, null, 2));
        console.log(`💾 news.json updated: ${combined.length} items (V66.7)`);
    } catch (err) {
        console.error(`❌ [FileIO] Write failed: ${err.message}`);
    }
}

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════

async function startScrapers() {
    await updateTwitter();
    setInterval(updateTwitter, 120000); // 2 mins
}

app.listen(PORT, () => {
    console.log(`🚀 V66.7 ENGINE LIVE — Deep Diagnostic Swarm`);
    startScrapers();
});
