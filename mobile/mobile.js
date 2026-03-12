/* ═══════════════════════════════════════════
   RAS MIRQAB — MOBILE JS
   Standalone mobile logic, shares backend data
   ═══════════════════════════════════════════ */

(function () {
    'use strict';

    var PROXY_BASE = 'https://ras-mirqab-proxy.onrender.com';
    var STATIC_CACHE = '../public/data/news-live.json';
    var seenLinks = new Set();
    var allNews = [];

    // ═══════════════════════════════════════
    // LOGO MAP (same as backend)
    // ═══════════════════════════════════════
    var LOGO_MAP = {
        'ajanews': '../public/logos/aljazeera.png',
        'alarabiya_brk': '../public/logos/alarabiya.png',
        'alarabiya_br': '../public/logos/alarabiya.png',
        'alhadath': '../public/logos/alhadath.png',
        'asharqnewsbrk': '../public/logos/asharq.png',
        'newsnow4usa': '../public/logos/newsnow.jpg',
        'rtonline_ar': '../public/logos/rt.png',
        'skynewsarabia_b': '../public/logos/skynews.png',
        'skynewsarabia_breaking': '../public/logos/skynews.png',
        'ajmubasher': '../public/logos/aljazeera.png',
        'alekhbariyabrk': '../public/logos/alekhbariya.png',
        'alekhbariyanews': '../public/logos/alekhbariya.png',
        'alrougui': '../public/logos/alrougui.jpg',
        'kbsalsaud': '../public/logos/kbsalsaud.png',
        'modgovksa': '../public/logos/modgovksa2.png'
    };

    // ═══════════════════════════════════════
    // NEWS FETCHING
    // ═══════════════════════════════════════
    function getAvatar(item) {
        if (item.customAvatar) return '../' + item.customAvatar;
        var handle = (item.handle || '').toLowerCase();
        return LOGO_MAP[handle] || '../public/logos/aljazeera.png';
    }

    function getThumb(item) {
        if (item.localMedia) return '../' + item.localMedia;
        if (item.mediaUrl) return item.mediaUrl;
        // If no media, use the source avatar as thumbnail
        return getAvatar(item);
    }

    function timeAgo(dateStr) {
        var now = new Date();
        var d = new Date(dateStr);
        var diff = Math.floor((now - d) / 60000); // minutes
        if (diff < 1) return 'الآن';
        if (diff < 60) return diff + ' د';
        var hours = Math.floor(diff / 60);
        if (hours < 24) return hours + ' س';
        return Math.floor(hours / 24) + ' ي';
    }

    function renderNews() {
        var list = document.getElementById('news-list');
        if (!list || allNews.length === 0) return;

        // Sort by date descending
        allNews.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

        var html = '';
        var shown = allNews.slice(0, 30);
        for (var i = 0; i < shown.length; i++) {
            var item = shown[i];
            var avatar = getAvatar(item);
            var thumb = getThumb(item);
            var sourceName = item.customName || item.sourceName || item.handle || '';
            var time = timeAgo(item.pubDate);
            var sourceClass = item.source === 'telegram' ? 'tg' : 'tw';

            html += '<div class="news-item" onclick="window.open(\'' + (item.link || '#') + '\', \'_blank\')">'
                + '<div style="flex:1;min-width:0">'
                + '<div class="news-text">' + escHtml(item.title) + '</div>'
                + '<div class="news-meta">'
                + '<img class="news-source-avatar" src="' + avatar + '" onerror="this.src=\'../public/logos/aljazeera.png\'">'
                + '<span class="news-source">' + escHtml(sourceName) + '</span>'
                + '<span class="news-time">' + time + '</span>'
                + '</div></div>'
                + '<img class="news-thumb" src="' + thumb + '" onerror="this.src=\'' + avatar + '\'" loading="lazy">'
                + '</div>';
        }
        list.innerHTML = html;
    }

    function escHtml(s) {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function mergeItems(newItems) {
        for (var i = 0; i < newItems.length; i++) {
            var key = newItems[i].link || newItems[i].title;
            if (!seenLinks.has(key)) {
                seenLinks.add(key);
                allNews.push(newItems[i]);
            }
        }
    }

    // Fetch Telegram from proxy (real-time)
    function fetchTelegram() {
        fetch(PROXY_BASE + '/telegram?channel=ajanews')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok && data.items) {
                    mergeItems(data.items);
                    renderNews();
                }
            })
            .catch(function () { /* silent */ });
    }

    // Fetch Twitter from static cache
    function fetchTwitter() {
        fetch(STATIC_CACHE + '?t=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.items) {
                    mergeItems(data.items);
                    renderNews();
                }
            })
            .catch(function () { /* silent */ });
    }

    function loadNews() {
        fetchTelegram();
        fetchTwitter();
    }

    // ═══════════════════════════════════════
    // GLOBE
    // ═══════════════════════════════════════
    function initGlobe() {
        var container = document.getElementById('globe-container');
        if (!container || typeof Globe === 'undefined') return;

        var globe = Globe()
            .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
            .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
            .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
            .showAtmosphere(true)
            .atmosphereColor('#4488cc')
            .atmosphereAltitude(0.15)
            .width(container.offsetWidth)
            .height(container.offsetHeight)
            (container);

        // Focus on Middle East
        globe.pointOfView({ lat: 26, lng: 46, altitude: 2.2 }, 0);

        // Auto-rotate
        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.3;
        globe.controls().enableZoom = false;

        // Resize handler
        window.addEventListener('resize', function () {
            globe.width(container.offsetWidth);
            globe.height(container.offsetHeight);
        });

        // Hide map button
        var hideBtn = document.getElementById('btn-hide-map');
        var visible = true;
        if (hideBtn) {
            hideBtn.onclick = function () {
                visible = !visible;
                container.style.display = visible ? 'block' : 'none';
                hideBtn.textContent = visible ? 'Hide Map 🗺' : 'Show Map 🗺';
            };
        }
    }

    // ═══════════════════════════════════════
    // WORLD CLOCKS
    // ═══════════════════════════════════════
    function updateClocks() {
        var now = new Date();
        var fmt = function (tz) {
            return now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
        };
        var el;
        el = document.getElementById('clock-riyadh');
        if (el) el.textContent = fmt('Asia/Riyadh');
        el = document.getElementById('clock-nyc');
        if (el) el.textContent = fmt('America/New_York');
        el = document.getElementById('clock-london');
        if (el) el.textContent = fmt('Europe/London');
    }

    // ═══════════════════════════════════════
    // GOLD PRICE (same as desktop)
    // ═══════════════════════════════════════
    function fetchGold() {
        // Use TradingView widget data or a free API
        fetch('https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.rates && data.rates.XAU) {
                    var price = (1 / data.rates.XAU).toFixed(3);
                    var el = document.getElementById('gold-price');
                    if (el) el.textContent = Number(price).toLocaleString();
                }
            })
            .catch(function () {
                // Fallback price
                var el = document.getElementById('gold-price');
                if (el) el.textContent = '5,163.795';
                var ch = document.getElementById('gold-change');
                if (ch) ch.textContent = '(90.120) 1.77%';
            });
    }

    // ═══════════════════════════════════════
    // HARD SYNC
    // ═══════════════════════════════════════
    function setupHardSync() {
        var btn = document.getElementById('btn-hard-sync');
        if (btn) {
            btn.onclick = function () {
                seenLinks.clear();
                allNews = [];
                document.getElementById('news-list').innerHTML = '<div class="news-loading">جاري إعادة التحميل...</div>';
                loadNews();
                btn.textContent = '✓ synced';
                setTimeout(function () { btn.textContent = 'hard sync'; }, 2000);
            };
        }
    }

    // ═══════════════════════════════════════
    // BOTTOM NAV
    // ═══════════════════════════════════════
    function setupNav() {
        var items = document.querySelectorAll('.nav-item');
        items.forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                items.forEach(function (i) { i.classList.remove('active'); });
                item.classList.add('active');
            });
        });
    }

    // ═══════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════
    function init() {
        loadNews();
        setInterval(loadNews, 1000); // 1-second polling

        initGlobe();
        updateClocks();
        setInterval(updateClocks, 1000);
        
        fetchGold();
        setInterval(fetchGold, 60000);

        setupHardSync();
        setupNav();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
