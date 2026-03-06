/* ═══════════════════════════════════════════════
   RSS FEED CONFIGURATION & FETCHER
   ═══════════════════════════════════════════════ */

var RasMirqabData = window.RasMirqabData || {};

// RSS-to-JSON proxy (free, no key needed)
RasMirqabData.RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

RasMirqabData.feeds = {
    aljazeera: {
        name: 'الجزيرة',
        url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4571-a231-c8f1a65f4e44/73d0e1b4-532f-45ef-b135-bfdff8b8cab9',
        source: 'rss',
        lang: 'ar',
    },
    alarabiya: {
        name: 'العربية',
        url: 'https://www.alarabiya.net/feed/rss2/ar.xml',
        source: 'rss',
        lang: 'ar',
    },
    skynews_ar: {
        name: 'سكاي نيوز عربية',
        url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.skynewsarabia.com/web/rss',
        source: 'rss',
        lang: 'ar',
    },
    bbc_ar: {
        name: 'BBC عربي',
        url: 'https://feeds.bbci.co.uk/arabic/rss.xml',
        source: 'rss',
        lang: 'ar',
    },
    reuters: {
        name: 'رويترز',
        url: 'https://www.reutersagency.com/feed/',
        source: 'rss',
        lang: 'en',
    },
};

// Sample breaking news (used as fallback / demo data)
RasMirqabData.sampleBreakingNews = [
    { title: 'الجيش الإسرائيلي يطلب من سكان جنوب لبنان الانتقال فوراً شمال الليطاني', source: 'telegram', time: '16:30' },
    { title: 'انفجارات عنيفة تهز العاصمة السودانية الخرطوم وأنباء عن غارات جوية', source: 'telegram', time: '16:22' },
    { title: 'إيران تعلن اختبار صاروخ باليستي جديد ذو مدى يتجاوز 2000 كم', source: 'twitter', time: '16:15' },
    { title: 'وزارة الدفاع الروسية: تدمير 14 مسيّرة أوكرانية فوق شبه جزيرة القرم', source: 'telegram', time: '15:58' },
    { title: 'البنتاغون يعلن إرسال حاملة طائرات إضافية إلى شرق المتوسط', source: 'twitter', time: '15:45' },
    { title: 'تقارير عن إطلاق نار كثيف في مدينة الفاشر بولاية شمال دارفور', source: 'telegram', time: '15:30' },
    { title: 'مجلس الأمن يعقد جلسة طارئة لمناقشة التصعيد في الشرق الأوسط', source: 'rss', time: '15:20' },
    { title: 'أسعار النفط ترتفع 3% بعد تهديدات بإغلاق مضيق هرمز', source: 'twitter', time: '15:10' },
    { title: 'الصين تجري مناورات عسكرية بحرية كبرى بالقرب من تايوان', source: 'rss', time: '14:55' },
    { title: 'تركيا تعلن تحييد 12 عنصراً من PKK شمال العراق', source: 'telegram', time: '14:40' },
    { title: 'زلزال بقوة 6.2 يضرب جنوب إندونيسيا وتحذيرات من تسونامي', source: 'rss', time: '14:25' },
    { title: 'حزب الله يعلن استهداف مقر قيادة عسكري إسرائيلي بمسيّرات', source: 'telegram', time: '14:10' },
];

/**
 * Fetch RSS feed via proxy
 */
RasMirqabData.fetchFeed = async function (feedKey) {
    const feed = this.feeds[feedKey];
    if (!feed) return [];
    try {
        const proxyUrl = this.RSS_PROXY + encodeURIComponent(feed.url);
        // Fail fast after 4 seconds instead of hanging the entire dashboard
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const resp = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        const data = await resp.json();
        if (data.status === 'ok' && data.items) {
            return data.items.map(item => ({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                source: feed.name,
                sourceType: 'rss',
            }));
        }
    } catch (e) {
        console.warn('Feed fetch failed for', feedKey, e);
    }
    return [];
};
