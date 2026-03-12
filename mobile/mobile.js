/* ═══════════════════════════════════════════
   RAS MIRQAB — MOBILE JS v2
   Uses desktop globe.js directly, adds mobile-specific UI
   ═══════════════════════════════════════════ */
(function () {
    'use strict';

    var PROXY = 'https://ras-mirqab-proxy.onrender.com';
    var STATIC = '../public/data/news-live.json';
    var seenKeys = new Set();
    var allNews = [];

    // ═══ LOGO MAP ═══
    var LOGOS = {
        'ajanews': '../public/logos/aljazeera.png',
        'alarabiya_brk': '../public/logos/alarabiya.png',
        'alhadath': '../public/logos/alhadath.png',
        'asharqnewsbrk': '../public/logos/asharq.png',
        'newsnow4usa': '../public/logos/newsnow.jpg',
        'rtonline_ar': '../public/logos/rt.png',
        'skynewsarabia_b': '../public/logos/skynews.png',
        'ajmubasher': '../public/logos/aljazeera.png',
        'alekhbariyabrk': '../public/logos/alekhbariya.png',
        'alekhbariyanews': '../public/logos/alekhbariya.png',
        'alrougui': '../public/logos/alrougui.jpg',
        'kbsalsaud': '../public/logos/kbsalsaud.png',
        'modgovksa': '../public/logos/modgovksa2.png'
    };

    // ═══ LIVE TV CHANNELS (same as desktop) ═══
    var TV_CHANNELS = [
        { key: 'aljazeera', name: 'الجزيرة', videoId: 'bNyUyrR0PHo', logo: '../public/logos/aljazeera.png' },
        { key: 'alarabiya', name: 'العربية', videoId: 'n7eQejkXbnM', logo: '../public/logos/alarabiya.png' },
        { key: 'skynews', name: 'سكاي نيوز', videoId: 'U--OjmpjF5o', logo: '../public/logos/skynews.png' },
        { key: 'alhadath', name: 'الحدث', videoId: 'xWXpl7azI8k', logo: '../public/logos/alhadath.png' },
        { key: 'france24', name: 'France 24', videoId: '3ursYA8HMeo', logo: null },
        { key: 'bbc', name: 'BBC عربي', videoId: 'L8QJYzS9ezI', logo: null },
        { key: 'aljazeera-en', name: 'AJ English', videoId: '-jvLzK_OasE', logo: '../public/logos/aljazeera.png' },
        { key: 'trt', name: 'TRT World', videoId: 'p0m0h94C0f8', logo: null },
        { key: 'asharq', name: 'الشرق', videoId: 'S_fU10Q7lXg', logo: '../public/logos/asharq.png' },
        { key: 'bloomberg', name: 'Bloomberg', videoId: 'dp8PhLsUcFE', logo: null },
    ];
    var currentTV = 0; // Al Jazeera first

    // ═══ HELPERS ═══
    function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function avatar(item) {
        if (item.customAvatar) return '../' + item.customAvatar;
        return LOGOS[(item.handle || '').toLowerCase()] || '../public/logos/aljazeera.png';
    }
    function thumb(item) {
        if (item.localMedia) return '../' + item.localMedia;
        if (item.mediaUrl) return item.mediaUrl;
        return avatar(item);
    }
    function timeAgo(d) {
        var m = Math.floor((Date.now() - new Date(d)) / 60000);
        if (m < 1) return 'الآن';
        if (m < 60) return m + ' د';
        var h = Math.floor(m / 60);
        return h < 24 ? h + ' س' : Math.floor(h / 24) + ' ي';
    }
    function timeStr(d) {
        return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    // ═══ GLOBE (use desktop RasMirqabGlobe) ═══
    function initGlobe() {
        // The desktop globe.js is already loaded and will call RasMirqabGlobe.init()
        // We just need to make sure the containers exist (they do in our HTML)
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.init();
        }
    }

    // ═══ LAYER PANELS ═══
    function initLayerPanels() {
        var leftPanel = document.getElementById('panel-left');
        var rightPanel = document.getElementById('panel-right');
        if (!leftPanel || !rightPanel || !window.RasMirqabData || !RasMirqabData.categories) return;

        var keys = Object.keys(RasMirqabData.categories);
        var half = Math.ceil(keys.length / 2);

        keys.forEach(function (key, i) {
            var cat = RasMirqabData.categories[key];
            var lbl = document.createElement('label');
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = 'layer-' + key;
            cb.checked = cat.default !== false;
            cb.addEventListener('change', function () {
                // Trigger globe update
                if (window.RasMirqabGlobe) {
                    RasMirqabGlobe.init && document.getElementById('globe-container') && RasMirqabGlobe.init();
                }
            });

            var dot = document.createElement('span');
            dot.className = 'layer-dot';
            dot.style.background = cat.color;
            dot.style.boxShadow = '0 0 4px ' + cat.color;

            lbl.appendChild(cb);
            lbl.appendChild(dot);
            lbl.appendChild(document.createTextNode(' ' + cat.emoji + ' ' + cat.labelAr));

            (i < half ? rightPanel : leftPanel).appendChild(lbl);
        });
    }

    // ═══ HIDE / SHOW MAP ═══
    function initHideMap() {
        var btn = document.getElementById('btn-hide-map');
        var section = document.getElementById('globe-section');
        var visible = true;

        btn.addEventListener('click', function () {
            visible = !visible;
            if (visible) {
                section.style.height = '';
                section.style.minHeight = '';
                section.querySelectorAll('.layer-panel, .globe-bar, .auto-refresh, #globe-container, #map-container').forEach(function (el) {
                    el.style.display = '';
                });
                btn.textContent = 'Hide Map 🗺';
            } else {
                section.style.height = '0';
                section.style.minHeight = '0';
                section.querySelectorAll('.layer-panel, .globe-bar, .auto-refresh, #globe-container, #map-container').forEach(function (el) {
                    el.style.display = 'none';
                });
                btn.textContent = 'Show Map 🗺';
            }
        });

        // 2D / 3D
        document.getElementById('btn-2d').addEventListener('click', function () {
            document.getElementById('btn-2d').classList.add('active');
            document.getElementById('btn-3d').classList.remove('active');
            if (window.RasMirqabGlobe) RasMirqabGlobe.toggle();
        });
        document.getElementById('btn-3d').addEventListener('click', function () {
            document.getElementById('btn-3d').classList.add('active');
            document.getElementById('btn-2d').classList.remove('active');
            if (window.RasMirqabGlobe) RasMirqabGlobe.toggle();
        });
    }

    // ═══ NEWS ═══
    function merge(items) {
        for (var i = 0; i < items.length; i++) {
            var k = items[i].link || items[i].title;
            if (!seenKeys.has(k)) { seenKeys.add(k); allNews.push(items[i]); }
        }
    }

    function renderNews() {
        var list = document.getElementById('news-list');
        if (!list || !allNews.length) return;
        allNews.sort(function (a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

        var html = '';
        var shown = allNews.slice(0, 40);
        for (var i = 0; i < shown.length; i++) {
            var it = shown[i];
            var av = avatar(it);
            var th = thumb(it);
            var t = timeStr(it.pubDate);
            html += '<div class="news-item" data-idx="' + i + '">'
                + '<div class="news-content">'
                + '<div class="news-text">' + esc(it.title) + '</div>'
                + '<div class="news-meta">'
                + '<img class="news-avatar" src="' + av + '" onerror="this.src=\'../public/logos/aljazeera.png\'">'
                + '<span class="news-src">' + esc(it.customName || it.sourceName || it.handle || '') + '</span>'
                + '<span class="news-time">' + t + '</span>'
                + '</div></div>'
                + '<img class="news-thumb" src="' + th + '" onerror="this.src=\'' + av + '\'" loading="lazy">'
                + '</div>';
        }
        list.innerHTML = html;

        // Click to open popup
        list.onclick = function (e) {
            var item = e.target.closest('.news-item');
            if (!item) return;
            var idx = parseInt(item.dataset.idx);
            openNewsPopup(shown[idx]);
        };
    }

    function openNewsPopup(item) {
        var popup = document.getElementById('news-popup');
        var body = document.getElementById('popup-body');
        if (!popup || !body) return;

        var av = avatar(item);
        var mediaHtml = '';
        var mediaUrl = item.localMedia ? '../' + item.localMedia : item.mediaUrl;
        if (mediaUrl) {
            mediaHtml = '<img class="popup-media" src="' + mediaUrl + '" onerror="this.style.display=\'none\'">';
        }

        body.innerHTML =
            '<div class="popup-title">' + esc(item.title) + '</div>'
            + '<div class="popup-meta">'
            + '<img class="popup-src-avatar" src="' + av + '">'
            + '<span class="popup-src-name">' + esc(item.customName || item.sourceName || '') + '</span>'
            + '<span class="popup-src-time">' + timeAgo(item.pubDate) + '</span>'
            + '</div>'
            + mediaHtml
            + (item.link ? '<a href="' + item.link + '" target="_blank" style="display:block;margin-top:12px;color:var(--accent);font-size:13px">فتح المصدر ↗</a>' : '');

        popup.classList.remove('hidden');
    }

    function initPopup() {
        var popup = document.getElementById('news-popup');
        document.getElementById('popup-close').onclick = function () { popup.classList.add('hidden'); };
        popup.querySelector('.popup-overlay').onclick = function () { popup.classList.add('hidden'); };
    }

    function fetchTelegram() {
        fetch(PROXY + '/telegram?channel=ajanews')
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d.ok && d.items) { merge(d.items); renderNews(); } })
            .catch(function () {});
    }
    function fetchTwitter() {
        fetch(STATIC + '?t=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d && d.items) { merge(d.items); renderNews(); } })
            .catch(function () {});
    }
    function loadNews() { fetchTelegram(); fetchTwitter(); }

    // ═══ LIVE TV ═══
    function initTV() {
        renderTVCarousel();
        playChannel(0); // Al Jazeera first, autoplay with audio
    }

    function renderTVCarousel() {
        var carousel = document.getElementById('tv-carousel');
        if (!carousel) return;
        var html = '';
        TV_CHANNELS.forEach(function (ch, i) {
            var imgSrc = ch.logo || ('https://img.youtube.com/vi/' + ch.videoId + '/mqdefault.jpg');
            html += '<div class="tv-card' + (i === currentTV ? ' active' : '') + '" data-idx="' + i + '">'
                + '<div class="live-dot"></div>'
                + '<img src="' + imgSrc + '" alt="' + ch.name + '">'
                + '<div class="ch-name">' + ch.name + '</div>'
                + '</div>';
        });
        carousel.innerHTML = html;

        carousel.onclick = function (e) {
            var card = e.target.closest('.tv-card');
            if (!card) return;
            playChannel(parseInt(card.dataset.idx));
        };
    }

    function playChannel(idx) {
        currentTV = idx;
        var ch = TV_CHANNELS[idx];
        var player = document.getElementById('tv-player');
        if (player) {
            player.src = 'https://www.youtube.com/embed/' + ch.videoId + '?autoplay=1&mute=0&rel=0&playsinline=1';
        }
        // Update active state
        var cards = document.querySelectorAll('.tv-card');
        cards.forEach(function (c, i) {
            c.classList.toggle('active', i === idx);
        });
    }

    // ═══ CLOCKS ═══
    function updateClocks() {
        var fmt = function (tz) {
            return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
        };
        var e;
        e = document.getElementById('clk-riyadh'); if (e) e.textContent = fmt('Asia/Riyadh');
        e = document.getElementById('clk-nyc'); if (e) e.textContent = fmt('America/New_York');
        e = document.getElementById('clk-london'); if (e) e.textContent = fmt('Europe/London');
    }

    // ═══ HARD SYNC ═══
    function initSync() {
        var btn = document.getElementById('btn-hard-sync');
        if (btn) btn.onclick = function () {
            seenKeys.clear(); allNews = [];
            document.getElementById('news-list').innerHTML = '<div class="news-loading">جاري إعادة التحميل...</div>';
            loadNews();
            btn.textContent = '✓ synced';
            setTimeout(function () { btn.textContent = 'hard sync'; }, 2000);
        };
    }

    // ═══ BOTTOM NAV ═══
    function initNav() {
        document.getElementById('bottom-nav').onclick = function (e) {
            var item = e.target.closest('.nav-item');
            if (!item) return;
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
            item.classList.add('active');
        };
    }

    // ═══ INIT ═══
    function init() {
        initGlobe();
        initLayerPanels();
        initHideMap();
        initPopup();
        initSync();
        initNav();
        initTV();

        loadNews();
        setInterval(loadNews, 1000);

        updateClocks();
        setInterval(updateClocks, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
