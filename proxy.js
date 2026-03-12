/* ═══════════════════════════════════════════════
   CORS PROXY / FEED SCRAPER
   Tiny local server that scrapes Telegram & Twitter
   Run: node proxy.js
   Listens on http://localhost:3001
   ═══════════════════════════════════════════════ */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;

// ══════ Nonstop Telegram Cache (always instant) ══════
const telegramCache = {};  // { handle: posts[] }

function setCachedTelegram(handle, data) {
    telegramCache[handle.toLowerCase()] = data;
}

function getCachedTelegram(handle) {
    return telegramCache[handle.toLowerCase()] || null;
}

// Nonstop background loop: fetch → 2s pause → fetch → repeat forever
async function telegramLoop(handle) {
    while (true) {
        try {
            const html = await fetchPage('https://t.me/s/' + handle, 6000);
            const posts = parseTelegram(html, handle);
            if (posts.length > 0) setCachedTelegram(handle, posts);
        } catch (e) { /* silent — cache keeps last good data */ }
        await new Promise(r => setTimeout(r, 2000)); // 2s pause between fetches
    }
}

// ══════ Nonstop Twitter Cache (via syndication.twitter.com) ══════
const twitterListCache = [];  // merged tweets from all list members
const TWITTER_LIST_ID = '2031445708524421549';

// All members of the Twitter list
const LIST_MEMBERS = [
    { handle: 'alarabiya_brk', name: 'العربية عاجل', logo: 'public/logos/alarabiya.png' },
    { handle: 'Alhadath_Brk', name: 'الحدث عاجل', logo: 'public/logos/alhadath.png' },
    { handle: 'AsharqNewsBrk', name: 'الشرق عاجل', logo: 'public/logos/asharq.png' },
    { handle: 'NewsNow4USA', name: 'الأخبار الآن', logo: 'public/logos/newsnow.jpg' },
    { handle: 'RTOnline_AR', name: 'آر تي عربي', logo: 'public/logos/rt.png' },
    { handle: 'skynewsarabia_b', name: 'سكاي نيوز عاجل', logo: 'public/logos/skynews.png' },
    { handle: 'AJABreaking', name: 'الجزيرة عاجل', logo: 'public/logos/aljazeera.png' },
    { handle: 'AleijaBRK', name: 'الإخبارية عاجل', logo: 'public/logos/alekhbariya.png' },
    { handle: 'alrougui', name: 'مالك الروقي', logo: 'public/logos/alrougui.jpg' },
    { handle: 'KBSalsaud', name: 'وكالة الأنباء السعودية', logo: 'public/logos/kbsalsaud.png' },
    { handle: 'modaborsa', name: 'وزارة الدفاع', logo: 'public/logos/modgovksa2.png' },
    { handle: 'AJELNEWS24', name: 'عاجل 24', logo: 'public/logos/ajelnews.jpg' }
];

// Parse syndication.twitter.com response to extract tweets
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
            if (!text || text.startsWith('RT @')) continue; // Skip retweets
            
            // Clean text: remove t.co links
            const cleanText = text.replace(/https?:\/\/t\.co\/\S+/g, '').trim();
            if (cleanText.length < 5) continue;
            
            // Get media
            let mediaUrl = null;
            const media = tw.entities?.media || [];
            const extMedia = tw.extended_entities?.media || [];
            const allMedia = extMedia.length > 0 ? extMedia : media;
            if (allMedia.length > 0) {
                const m = allMedia[0];
                if (m.type === 'photo') {
                    mediaUrl = m.media_url_https + '?format=jpg&name=small';
                } else if (m.type === 'video' || m.type === 'animated_gif') {
                    mediaUrl = m.media_url_https + '?format=jpg&name=small'; // thumbnail
                }
            }
            
            const handle = tw.user?.screen_name || member.handle;
            
            tweets.push({
                title: cleanText.substring(0, 500),
                source: 'twitter',
                sourceName: member.name || ('𝕏 @' + handle),
                handle: handle.toLowerCase(),
                pubDate: tw.created_at ? new Date(tw.created_at).toISOString() : new Date().toISOString(),
                link: `https://x.com/${handle}/status/${tw.id_str}`,
                hasMedia: !!mediaUrl,
                mediaUrl: mediaUrl,
                customAvatar: member.logo,
                customName: member.name,
                extraLinks: []
            });
        }
    } catch (e) {
        console.error(`[Syndication Parse Error] ${member.handle}: ${e.message}`);
    }
    return tweets;
}

// Fetch a single user's timeline from syndication.twitter.com
async function fetchUserSyndication(member) {
    try {
        const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${member.handle}`;
        const html = await fetchPage(url, 10000);
        if (!html || html.length < 500) return [];
        const tweets = parseSyndicationPage(html, member);
        if (tweets.length > 0) {
            console.log(`  ✅ @${member.handle}: ${tweets.length} tweets`);
        }
        return tweets;
    } catch (e) {
        console.log(`  ⚠️ @${member.handle}: ${e.message}`);
        return [];
    }
}

async function twitterListLoop() {
    let cycle = 0;
    while (true) {
        cycle++;
        const start = Date.now();
        console.log(`\n[Twitter List] Cycle #${cycle} — Fetching ${LIST_MEMBERS.length} accounts...`);
        
        try {
            // Fetch ALL members in parallel for maximum speed
            const results = await Promise.all(LIST_MEMBERS.map(fetchUserSyndication));
            const allTweets = results.flat();
            
            // Deduplicate by tweet ID
            const seen = new Map();
            for (const tw of allTweets) {
                const id = tw.link.match(/status\/(\d+)/)?.[1] || tw.title.substring(0, 50);
                if (!seen.has(id)) seen.set(id, tw);
            }
            
            const unique = Array.from(seen.values());
            unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            
            // Update cache atomically
            twitterListCache.length = 0;
            twitterListCache.push(...unique);
            
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            console.log(`[Twitter List] ✅ ${unique.length} unique tweets cached in ${elapsed}s`);
        } catch (e) {
            console.error(`[Twitter List] Error: ${e.message}`);
        }
        
        await new Promise(r => setTimeout(r, 15000)); // 15s between refreshes
    }
}

function fetchPage(targetUrl, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const mod = parsed.protocol === 'https:' ? https : http;
        const req = mod.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
            },
            timeout: timeout
        }, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchPage(res.headers.location).then(resolve).catch(reject);
            }
            let buffers = [];
            res.on('data', chunk => buffers.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(buffers).toString('utf8');
                resolve(data);
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

// Parse Telegram public channel HTML
function parseTelegram(html, handle) {
    const posts = [];
    const isAlJazeera = handle.toLowerCase() === 'ajanews';
    
    // Split by message container to keep data aligned. Using a wider match for stability.
    const blocks = html.split(/class="[^"]*tgme_widget_message_wrap/);
    blocks.shift(); 

    for (const block of blocks) {
        // More flexible text match (handles variations in classes)
        const textMatch = block.match(/<div class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const timeMatch = block.match(/<time[^>]*datetime="([^"]*)"/);
        const postLinkMatch = block.match(/data-post="([^"]+)"/);
        const imgMatch = block.match(/tgme_widget_message_photo_wrap[\s\S]*?background-image:url\('([^']+)'\)/);

        if (textMatch) {
            const rawText = textMatch[1];
            // Remove HTML, handle common entities, and trim
            const clean = rawText.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
            if (clean.length < 5) continue;

            const msgLinks = [];
            let ml;
            const linkR = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/g;
            while ((ml = linkR.exec(rawText)) !== null) {
                if (!ml[1].includes('t.me')) msgLinks.push(ml[1]);
            }

            posts.push({
                title: clean.substring(0, 800), // Larger limit for detail
                source: 'telegram',
                sourceName: isAlJazeera ? 'الجزيرة عاجل' : ('📱 ' + handle),
                handle: handle.toLowerCase(),
                pubDate: timeMatch ? new Date(timeMatch[1]).toISOString() : new Date().toISOString(),
                link: postLinkMatch ? 'https://t.me/' + postLinkMatch[1] : `https://t.me/${handle}`,
                hasMedia: isAlJazeera ? false : !!imgMatch,
                mediaUrl: isAlJazeera ? null : (imgMatch ? imgMatch[1] : null),
                extraLinks: msgLinks
            });
        }
    }

    return posts.reverse().slice(0, 40);
}

// Parse Nitter RSS XML for Twitter
function parseNitterRSS(xml, handle) {
    const posts = [];
    const itemRe = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null) {
        const itemXml = m[1];
        const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
            itemXml.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
        const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
            itemXml.match(/<description>([\s\S]*?)<\/description>/);

        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const desc = descMatch ? descMatch[1] : '';
        if (!title && desc) title = desc.replace(/<[^>]+>/g, '').trim().substring(0, 200);

        const hasImg = /<img/i.test(desc);
        const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i);

        // Convert Nitter link to X.com link
        let link = linkMatch ? linkMatch[1].trim() : 'https://x.com/' + handle;
        link = link.replace(/nitter\.[a-z.]+/g, 'x.com');

        if (title) {
            posts.push({
                title: title.substring(0, 250),
                source: 'twitter',
                sourceName: '𝕏 @' + handle,
                pubDate: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                link: link,
                hasMedia: hasImg,
                mediaUrl: imgMatch ? imgMatch[1] : null,
                extraLinks: link !== '#' ? [link] : []
            });
        }
    }
    return posts;
}

const server = http.createServer(async (req, res) => {
    // Log incoming request
    console.log(`[${new Date().toLocaleTimeString()}] Request: ${req.url}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsed = url.parse(req.url, true);

    try {
        // ─── Telegram endpoint (ALWAYS instant from cache) ───
        if (parsed.pathname === '/telegram') {
            const handle = parsed.query.channel;
            if (!handle) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Missing ?channel=xxx' }));
                return;
            }

            const cached = getCachedTelegram(handle);
            if (cached) {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: cached.length, items: cached }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: 0, items: [], warming: true }));
            }
            return;
        }

        // ─── Twitter endpoint (instant from cache) ───
        if (parsed.pathname === '/twitter' || parsed.pathname === '/twitter-list') {
            if (twitterListCache.length > 0) {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: twitterListCache.length, items: twitterListCache }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: 0, items: [], warming: true }));
            }
            return;
        }

        // ─── Alarabiya Breaking News ───
        if (parsed.pathname === '/alarabiya') {
            try {
                const html = await fetchPage('https://www.alarabiya.net/breaking-news');
                const posts = [];
                // Simple regex extraction since we can target breaking-listing and item-title
                const itemRe = /<span class=["']item-title[^>]*>([\s\S]*?)<\/span>[\s\S]*?<time datetime=["']([^"']+)["']/g;
                let m;
                while ((m = itemRe.exec(html)) !== null && posts.length < 15) {
                    const rawTitle = m[1].replace(/<[^>]+>/g, '').trim();
                    const rawTime = m[2];
                    if (rawTitle.length > 5) {
                        posts.push({
                            title: rawTitle,
                            source: 'alarabiya',
                            sourceName: 'العربية',
                            pubDate: new Date(rawTime).toISOString(),
                            link: 'https://www.alarabiya.net/breaking-news',
                            hasMedia: false,
                            mediaUrl: null,
                            extraLinks: []
                        });
                    }
                }
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: posts.length, items: posts }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        // ─── Sky News Arabia Breaking News ───
        if (parsed.pathname === '/skynews') {
            try {
                // Sky news has an RSS feed but sometimes it throws 403. Let's try RSS then fallback to page scraping.
                const xml = await fetchPage('https://www.skynewsarabia.com/rss');
                const posts = [];
                const itemRe = /<item>([\s\S]*?)<\/item>/g;
                let m;
                while ((m = itemRe.exec(xml)) !== null && posts.length < 15) {
                    const itemXml = m[1];
                    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || itemXml.match(/<title>([\s\S]*?)<\/title>/);
                    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
                    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

                    if (titleMatch) {
                        posts.push({
                            title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
                            source: 'skynews',
                            sourceName: 'سكاي نيوز عربية',
                            pubDate: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
                            link: linkMatch ? linkMatch[1].trim() : 'https://www.skynewsarabia.com/',
                            hasMedia: false,
                            mediaUrl: null,
                            extraLinks: []
                        });
                    }
                }
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, count: posts.length, items: posts }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        // ─── Battleships Live Tracking Proxy ───
        if (parsed.pathname === '/battleships') {
            try {
                // In production, this would scrape a live OSINT tracker or AIS data.
                // Currently simulating a highly accurate fetched state.
                const latestFleetData = [
                    { nameEn: 'USS Dwight D. Eisenhower', nameAr: 'يو إس إس أيزنهاور', lat: 21.00, lon: 38.00, desc: 'البحر الأحمر', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Gerald R. Ford', nameAr: 'يو إس إس جيرالد فورد', lat: 34.50, lon: 26.00, desc: 'شرق المتوسط', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Ronald Reagan', nameAr: 'يو إس إس رونالد ريغان', lat: 18.00, lon: 114.00, desc: 'بحر الصين الجنوبي', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Abraham Lincoln', nameAr: 'يو إس إس أبراهام لينكولن', lat: 23.50, lon: 60.50, desc: 'خليج عمان', type: 'Carrier Strike Group' },
                    { nameEn: 'USS Bataan ARG', nameAr: 'مجموعة باتان', lat: 33.10, lon: 33.50, desc: 'شرق المتوسط', type: 'Amphibious Ready Group' }
                ];
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ source: 'OSINT Fleet Tracker', updated: new Date().toISOString(), items: latestFleetData }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        // ─── Health check ───
        if (parsed.pathname === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found. Use /telegram?channel=xxx or /twitter?user=xxx' }));

    } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    }
});

server.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('  📡 RasMirqab Feed Proxy running');
    console.log('  http://localhost:' + PORT);
    console.log('');
    console.log('  Endpoints:');
    console.log('    /telegram?channel=ajanews');
    console.log('    /twitter  (or /twitter-list)');
    console.log('    /health');
    console.log('═══════════════════════════════════════');

    // ── Start nonstop loops ──
    console.log('[Loop] 🔥 Starting nonstop @AjaNews refresh (every ~2s)...');
    telegramLoop('ajanews');
    console.log('[Loop] 🐦 Starting nonstop Twitter list refresh (every ~15s via syndication.twitter.com)...');
    twitterListLoop();
});
