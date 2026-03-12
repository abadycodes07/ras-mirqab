/* ═══════════════════════════════════════════════
   Ras Mirqab - High-Speed Cloud Scraper (Final)
   Saves aggregated news to public/data/news-live.json
   ═══════════════════════════════════════════════ */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const crypto = require('crypto');

// Hard timeout: kill process after 2.5 minutes to prevent hanging GitHub Actions
setTimeout(() => { console.log('⏰ Global timeout reached — exiting.'); process.exit(0); }, 150000);

const OUTPUT_FILE = path.join(__dirname, '../public/data/news-live.json');
const MEDIA_DIR = path.join(__dirname, '../public/data/media');

// Ensure directories exist
if (!fs.existsSync(path.dirname(OUTPUT_FILE))) fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

// Twitter list members (same as proxy.js)
const LIST_MEMBERS = [
    { handle: 'alarabiya_brk', name: 'العربية عاجل' },
    { handle: 'Alhadath_Brk', name: 'الحدث عاجل' },
    { handle: 'AsharqNewsBrk', name: 'الشرق عاجل' },
    { handle: 'NewsNow4USA', name: 'الأخبار الآن' },
    { handle: 'RTOnline_AR', name: 'آر تي عربي' },
    { handle: 'skynewsarabia_b', name: 'سكاي نيوز عاجل' },
    { handle: 'AJABreaking', name: 'الجزيرة عاجل' },
    { handle: 'AleijaBRK', name: 'الإخبارية عاجل' },
    { handle: 'alrougui', name: 'مالك الروقي' },
    { handle: 'KBSalsaud', name: 'وكالة الأنباء السعودية' },
    { handle: 'modaborsa', name: 'وزارة الدفاع' },
    { handle: 'AJELNEWS24', name: 'عاجل 24' }
];

async function fetchWithTimeout(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const timer = setTimeout(() => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        }, timeout);

        const req = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        }, (res) => {
            clearTimeout(timer);
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const redirectUrl = new URL(res.headers.location, url).href;
                return fetchWithTimeout(redirectUrl, timeout).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

function parseSyndicationPage(html, member) {
    const tweets = [];
    try {
        const dataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (!dataMatch) return tweets;
        
        const json = JSON.parse(dataMatch[1]);
        const entries = json?.props?.pageProps?.timeline?.entries || [];
        
        for (const entry of entries) {
            if (entry.type !== 'tweet') continue;
            const tw = entry.content?.tweet;
            if (!tw) continue;
            
            const text = tw.full_text || tw.text || '';
            if (!text || text.startsWith('RT @')) continue;
            
            const cleanText = text.replace(/https?:\/\/t\.co\/\S+/g, '').trim();
            if (cleanText.length < 5) continue;
            
            let mediaUrl = null;
            const extMedia = tw.extended_entities?.media || tw.entities?.media || [];
            if (extMedia.length > 0) {
                const m = extMedia[0];
                mediaUrl = m.media_url_https + '?format=jpg&name=small';
            }
            
            const handle = (tw.user?.screen_name || member.handle).toLowerCase();
            
            tweets.push({
                title: cleanText.substring(0, 500),
                source: 'twitter',
                sourceName: member.name || tw.user?.name || handle,
                handle: handle,
                pubDate: tw.created_at ? new Date(tw.created_at).toISOString() : new Date().toISOString(),
                link: `https://x.com/${handle}/status/${tw.id_str}`,
                hasMedia: !!mediaUrl,
                mediaUrl: mediaUrl
            });
        }
    } catch (e) {
        console.error(`[Parse Error] ${member.handle}: ${e.message}`);
    }
    return tweets;
}

async function scrapeTwitterList() {
    console.log(`--- Fetching ${LIST_MEMBERS.length} Twitter accounts via syndication.twitter.com ---`);
    
    const fetches = LIST_MEMBERS.map(async (member) => {
        try {
            const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${member.handle}`;
            const html = await fetchWithTimeout(url, 15000);
            if (!html || html.length < 500) return [];
            const tweets = parseSyndicationPage(html, member);
            if (tweets.length > 0) console.log(`✅ @${member.handle}: ${tweets.length} tweets`);
            else console.log(`⚠️ @${member.handle}: 0 tweets`);
            return tweets;
        } catch (e) {
            console.log(`⚠️ @${member.handle}: failed — ${e.message}`);
            return [];
        }
    });

    const allResults = await Promise.all(fetches);
    const merged = allResults.flat();
    
    // Deduplicate by tweet ID
    const seen = new Map();
    for (const item of merged) {
        const id = item.link.match(/status\/(\d+)/)?.[1] || item.title;
        if (!seen.has(id)) seen.set(id, item);
    }
    
    const unique = Array.from(seen.values());
    console.log(`📊 Total unique tweets: ${unique.length} (from ${merged.length} raw)`);
    return unique;
}

async function scrapeAll() {
    console.log('--- Starting Twitter Scrape via syndication.twitter.com ---');
    
    const allItems = await scrapeTwitterList();

    // Sort by date, newest first
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
        updated: new Date().toISOString(),
        count: allItems.length,
        items: allItems.slice(0, 120)
    }, null, 2));
    
    console.log(`✅ Scrape Complete: ${allItems.length} items saved.`);
}

scrapeAll();
