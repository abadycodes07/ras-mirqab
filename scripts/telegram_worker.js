const cheerio = require('cheerio');

/**
 * V1.0: Real-Time Telegram Web Scraper (Scrape.do Premium)
 * Targets: t.me/s/ajanews, t.me/s/alhadath_brk
 */

const SCRAPEDO_KEY = process.env.SCRAPEDO_API_KEY || "adb11bc4e66248e186ac5316a1d4cf83a3bf18168cf";
const CHANNELS = ["ajanews", "alhadath_brk", "alarabiyaBr"];

async function fetchTelegram(channel) {
    process.stderr.write(`📡 [Telegram] V75.1: Premium Scrape (t.me/s/${channel})...\n`);
    const targetUrl = `https://t.me/s/${channel}`;
    const apiUrl = `https://api.scrape.do?token=${SCRAPEDO_KEY}&url=${encodeURIComponent(targetUrl)}&render=true&wait=2000`;
    
    try {
        const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const html = await resp.text();
        return parseTelegramItems(html, channel);
    } catch (e) {
        process.stderr.write(`❌ [Telegram] Error fetching ${channel}: ${e.message}\n`);
        return [];
    }
}

function parseTelegramItems(html, channel) {
    const $ = cheerio.load(html);
    const results = [];
    
    $('.tgme_widget_message_wrap').each((i, el) => {
        if (i >= 50) return; 
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
