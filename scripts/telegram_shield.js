const cheerio = require('cheerio');

/**
 * V1.0: Real-Time Telegram Web Scraper (Scrape.do Premium)
 * Targets: t.me/s/ajanews, t.me/s/alhadath_brk
 */

const SCRAPEDO_KEY = process.env.SCRAPEDO_API_KEY || "adb11bc4e66248e186ac5316a1d4cf83a3bf18168cf";
const CHANNELS = ["ajanews", "alhadath_brk", "alarabiyaBr"];

async function fetchTelegram(channel) {
    process.stderr.write(`📡 [Telegram] V75.7: Multi-Fetch Recovery (${channel})...\n`);
    const results = [];
    
    // 1. Primary: Direct t.me/s/ (Web Preview)
    try {
        const targetUrl = `https://t.me/s/${channel}`;
        const resp = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            signal: AbortSignal.timeout(15000)
        });
        if (resp.ok) {
            const html = await resp.text();
            results.push(...parseTelegramItems(html, channel));
        }
    } catch (e) { process.stderr.write(`⚠️ [Telegram] Web Preview failed: ${e.message}\n`); }

    // 2. Secondary: RSS.app / RSSHub Fallback (Guarantees History)
    // Using a known working RSS bridge for these specific channels if needed
    try {
        const rssUrls = {
            'ajanews': 'https://rss.app/feeds/v1.1/wkS1m06mHt2j7163.json', // Already configured for user
            'alhadath_brk': 'https://rss.app/feeds/v1.1/hM0862sY5N810N5K.json' 
        };
        if (rssUrls[channel]) {
            const resp = await fetch(rssUrls[channel], { signal: AbortSignal.timeout(10000) });
            if (resp.ok) {
                const data = await resp.json();
                const items = (data.items || []).map(it => ({
                    title: it.title || it.description || "",
                    link: it.url || it.link || `https://t.me/${channel}`,
                    pubDate: it.date_published || it.pubDate || new Date().toISOString(),
                    source: "telegram",
                    sourceHandle: channel,
                    sourceName: channel === 'ajanews' ? 'الجزيرة' : (channel === 'alarabiyaBr' ? 'العربية' : (channel === 'alhadath_brk' ? 'الحدث' : channel)),
                    mediaUrl: it.image || it.thumbnail || (it.attachments?.[0]?.url) || null
                }));
                results.push(...items);
            }
        }
    } catch (e) { process.stderr.write(`⚠️ [Telegram] RSS Recovery failed: ${e.message}\n`); }

    return results;
}

function parseTelegramItems(html, channel) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('.tgme_widget_message_wrap').each((i, el) => {
        if (i >= 40) return; 
        const $msg = $(el);
        
        const title = $msg.find('.tgme_widget_message_text').text().trim();
        if (!title) return;

        const link = $msg.find('.tgme_widget_message_date a').attr('href');
        const timestamp = $msg.find('time').attr('datetime');
        
        let mediaUrl = null;
        const photoStyle = $msg.find('.tgme_widget_message_photo_wrap').attr('style');
        if (photoStyle) {
            const match = photoStyle.match(/url\(['"]?(.*?)['"]?\)/);
            if (match) mediaUrl = match[1];
        }

        results.push({
            title: title.substring(0, 500),
            link: link || `https://t.me/${channel}`,
            pubDate: timestamp || new Date().toISOString(),
            source: "telegram",
            sourceHandle: channel,
            sourceName: channel === 'ajanews' ? 'الجزيرة' : (channel === 'alarabiyaBr' ? 'العربية' : (channel === 'alhadath_brk' ? 'الحدث' : channel)),
            mediaUrl: mediaUrl
        });
    });
    
    return results;
}

async function main() {
    const fetches = CHANNELS.map(ch => fetchTelegram(ch));
    const allItems = await Promise.all(fetches);
    const flat = allItems.flat().sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
    process.stdout.write(JSON.stringify(flat, null, 2));
}

main();
