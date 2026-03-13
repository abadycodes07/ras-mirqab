/**
 * RasMirqab Paid Twitter Scraper Systems
 * System 1: RapidAPI (Direct Fetch)
 * System 2: Apify (Managed Actor)
 * Feature: 2-Minute Smart Caching & Error Resiliency
 */

const axios = require('axios');

// CONFIGURATION (Add your keys here)
const CONFIG = {
    RAPIDAPI_KEY: 'YOUR_RAPIDAPI_KEY',
    RAPIDAPI_HOST: 'twitter-api45.p.rapidapi.com', // Example provider
    APIFY_TOKEN: 'YOUR_APIFY_TOKEN',
    LIST_ID: '2031445708524421549',
    CACHE_TTL: 2 * 60 * 1000 // 2 Minutes
};

// GLOBAL CACHE
let globalCache = {
    data: [],
    lastUpdated: 0
};

/**
 * Helper: Process raw tweets into RasMirqab standard format
 */
function mapTweets(rawTweets) {
    if (!Array.isArray(rawTweets)) return [];
    return rawTweets.map(t => ({
        id: t.id_str || t.id,
        text: t.full_text || t.text || '',
        author: t.user ? t.user.name : 'Unknown',
        username: t.user ? t.user.screen_name : '',
        timestamp: t.created_at,
        media: (t.entities && t.entities.media) ? t.entities.media[0].media_url_https : null,
        link: `https://x.com/i/status/${t.id_str || t.id}`
    }));
}

/**
 * SYSTEM 1: RapidAPI
 * Best for: High speed, lower cost per request.
 */
async function fetchViaRapidAPI() {
    console.log('[RapidAPI] 🚀 Fetching Twitter List...');
    const options = {
        method: 'GET',
        url: `https://${CONFIG.RAPIDAPI_HOST}/list_tweets.php`, // Endpoint varies by provider
        params: { list_id: CONFIG.LIST_ID },
        headers: {
            'X-RapidAPI-Key': CONFIG.RAPIDAPI_KEY,
            'X-RapidAPI-Host': CONFIG.RAPIDAPI_HOST
        }
    };

    try {
        const response = await axios.request(options);
        // Map based on the specific RapidAPI provider's JSON structure
        const raw = response.data.tweets || response.data.timeline || [];
        return mapTweets(raw);
    } catch (error) {
        console.error('[RapidAPI] ❌ Error:', error.message);
        throw error;
    }
}

/**
 * SYSTEM 2: Apify
 * Best for: Highest reliability, handles complex blocks/fingerprinting.
 */
async function fetchViaApify() {
    console.log('[Apify] 🚀 Starting Actor...');
    try {
        // 1. Run the Actor (Twitter List Scraper)
        // Actor ID example: "apidojo/twitter-list-scraper"
        const runUrl = `https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/runs?token=${CONFIG.APIFY_TOKEN}`;
        const runResponse = await axios.post(runUrl, {
            listUrls: [`https://x.com/i/lists/${CONFIG.LIST_ID}`],
            maxTweets: 40
        });

        const runId = runResponse.data.data.id;
        const defaultDatasetId = runResponse.data.data.defaultDatasetId;

        console.log(`[Apify] ⏳ Task ${runId} started. Waiting for completion...`);

        // 2. Wait for completion (Polling)
        let finished = false;
        while (!finished) {
            const statusUrl = `https://api.apify.com/v2/acts/apidojo~twitter-list-scraper/runs/${runId}?token=${CONFIG.APIFY_TOKEN}`;
            const statusRes = await axios.get(statusUrl);
            if (statusRes.data.data.status === 'SUCCEEDED') {
                finished = true;
            } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(statusRes.data.data.status)) {
                throw new Error(`Actor failed with status: ${statusRes.data.data.status}`);
            } else {
                await new Promise(r => setTimeout(r, 5000)); // Wait 5s before next check
            }
        }

        // 3. Fetch Results
        const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${CONFIG.APIFY_TOKEN}`;
        const datasetRes = await axios.get(datasetUrl);
        return mapTweets(datasetRes.data);
    } catch (error) {
        console.error('[Apify] ❌ Error:', error.message);
        throw error;
    }
}

/**
 * MAIN CONTROLLER: Unified Access with Caching
 * @param {string} methodName - 'rapidapi' or 'apify'
 */
async function getTwitterNews(methodName = 'rapidapi') {
    const now = Date.now();

    // 1. Check Cache
    if (globalCache.data.length > 0 && (now - globalCache.lastUpdated < CONFIG.CACHE_TTL)) {
        console.log('[Cache] ⚡ Serving from memory (Fresh)');
        return globalCache.data;
    }

    // 2. Fetch New Data
    try {
        let freshData = [];
        if (methodName === 'rapidapi') {
            freshData = await fetchViaRapidAPI();
        } else {
            freshData = await fetchViaApify();
        }

        // 3. Update Cache
        if (freshData && freshData.length > 0) {
            globalCache.data = freshData;
            globalCache.lastUpdated = now;
            console.log(`[Cache] ✅ Updated with ${freshData.length} items.`);
        }
        return globalCache.data;
    } catch (err) {
        // ERROR HANDLING: Return stale data if API fails
        console.warn('[System] ⚠️ API Failed. Falling back to last known good data.');
        return globalCache.data;
    }
}

// EXAMPLE SERVER INTEGRATION
// const express = require('express');
// const app = express();
// app.get('/breaking-news', async (req, res) => {
//     const method = req.query.method || 'rapidapi'; 
//     const news = await getTwitterNews(method);
//     res.json({ ok: true, count: news.length, items: news });
// });

/**
 * Comparison Summary:
 * 
 * RAPIDAPI:
 * - Speed: Fast (Direct JSON response).
 * - Cost: Cheaper ($) - typically cost per successful request.
 * - Reliability: Good, but dependent on the specific provider's uptime.
 * 
 * APIFY:
 * - Speed: Slower (Takes 30-60s to boot a cloud browser and scrape).
 * - Cost: Higher ($$) - you pay for compute time + proxies.
 * - Reliability: Bulletproof (Uses real browsers, hardest to block).
 */
