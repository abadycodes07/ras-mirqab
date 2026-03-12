/* ═══════════════════════════════════════════
   RAS MIRQAB — MOBILE JS v3
   Globe shared with desktop, glassmorphism UI
   ═══════════════════════════════════════════ */
(function () {
    'use strict';

    var PROXY = 'https://ras-mirqab-proxy.onrender.com';
    var STATIC = '../public/data/news-live.json';
    var seenKeys = new Set();
    var allNews = [];

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

    var TV = [
        { key: 'aljazeera', name: 'الجزيرة', vid: 'bNyUyrR0PHo', logo: '../public/logos/aljazeera.png' },
        { key: 'alarabiya', name: 'العربية', vid: 'n7eQejkXbnM', logo: '../public/logos/alarabiya.png' },
        { key: 'skynews', name: 'سكاي نيوز', vid: 'U--OjmpjF5o', logo: '../public/logos/skynews.png' },
        { key: 'alhadath', name: 'الحدث', vid: 'xWXpl7azI8k', logo: '../public/logos/alhadath.png' },
        { key: 'france24', name: 'France 24', vid: '3ursYA8HMeo', logo: null },
        { key: 'bbc', name: 'BBC عربي', vid: 'L8QJYzS9ezI', logo: null },
        { key: 'trt', name: 'TRT World', vid: 'p0m0h94C0f8', logo: null },
        { key: 'asharq', name: 'الشرق', vid: 'S_fU10Q7lXg', logo: '../public/logos/asharq.png' },
    ];
    var curTV = 0;

    // ═══ HELPERS ═══
    function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function av(it) {
        if (it.customAvatar) return '../' + it.customAvatar;
        return LOGOS[(it.handle || '').toLowerCase()] || '../public/logos/aljazeera.png';
    }
    function th(it) {
        if (it.localMedia) return '../' + it.localMedia;
        if (it.mediaUrl) return it.mediaUrl;
        return av(it);
    }

    // ═══ TIME: Arabic minutes since release ═══
    function timeAgoAr(dateStr) {
        var m = Math.floor((Date.now() - new Date(dateStr)) / 60000);
        if (m < 1) return 'الآن';
        if (m < 2) return 'دقيقة';
        if (m < 11) return m + ' دقائق';
        if (m < 60) return m + ' دقيقة';
        var h = Math.floor(m / 60);
        if (h < 2) return 'ساعة';
        if (h < 11) return h + ' ساعات';
        if (h < 24) return h + ' ساعة';
        var d = Math.floor(h / 24);
        if (d < 2) return 'يوم';
        return d + ' أيام';
    }

    // ═══ GLOBE (use desktop globe.js directly) ═══
    function initGlobe() {
        // The desktop globe.js (RasMirqabGlobe) needs the #globe-container element
        // It's loaded via <script> tag, so just call init
        if (window.RasMirqabGlobe && typeof RasMirqabGlobe.init === 'function') {
            try {
                RasMirqabGlobe.init();
                console.log('[Mobile] Desktop globe initialized');
            } catch (e) {
                console.warn('[Mobile] Globe init error:', e);
                initFallbackGlobe();
            }
        } else {
            console.warn('[Mobile] RasMirqabGlobe not available, using fallback');
            initFallbackGlobe();
        }
    }

    function initFallbackGlobe() {
        var c = document.getElementById('globe-container');
        if (!c) return;
        // Use Globe.gl directly if available
        if (typeof Globe !== 'undefined') {
            try {
                var g = Globe()(c)
                    .backgroundColor('rgba(0,0,0,0)')
                    .showGlobe(true)
                    .globeImageUrl('../src/assets/earth-dark.jpg')
                    .bumpImageUrl('../src/assets/earth-topology.png')
                    .backgroundImageUrl('../src/assets/night-sky.png')
                    .showAtmosphere(true)
                    .atmosphereColor('#ff6a00')
                    .atmosphereAltitude(0.15)
                    .width(c.clientWidth)
                    .height(c.clientHeight);
                g.pointOfView({ lat: 25, lng: 45, altitude: 2.2 });
                var ctrl = g.controls();
                if (ctrl) { ctrl.autoRotate = true; ctrl.autoRotateSpeed = 0.3; ctrl.enableZoom = false; }
                window.addEventListener('resize', function () { g.width(c.clientWidth).height(c.clientHeight); });
                console.log('[Mobile] Fallback globe initialized');
            } catch (e) {
                console.error('[Mobile] Globe error:', e);
                c.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#d4a030;font-size:14px">🌍 تحميل الخريطة...</div>';
            }
        }
    }

    // ═══ LAYER PANELS ═══
    function initPanels() {
        var left = document.getElementById('panel-left');
        var right = document.getElementById('panel-right');
        if (!left || !right) return;

        // If desktop data available, use its categories
        if (window.RasMirqabData && RasMirqabData.categories) {
            var keys = Object.keys(RasMirqabData.categories);
            var half = Math.ceil(keys.length / 2);
            keys.forEach(function (key, i) {
                var cat = RasMirqabData.categories[key];
                var lbl = document.createElement('label');
                var cb = document.createElement('input');
                cb.type = 'checkbox'; cb.id = 'layer-' + key;
                cb.checked = cat.default !== false;
                var dot = document.createElement('span');
                dot.className = 'layer-dot';
                dot.style.background = cat.color;
                dot.style.boxShadow = '0 0 4px ' + cat.color;
                lbl.appendChild(cb);
                lbl.appendChild(dot);
                lbl.appendChild(document.createTextNode(' ' + (cat.emoji || '') + ' ' + cat.labelAr));
                (i < half ? right : left).appendChild(lbl);
            });
        } else {
            // Hardcoded fallback layers
            var layers = [
                { name: 'Naval fleets 🚢', color: '#4488cc' },
                { name: 'Military bases ✖', color: '#e04040' },
                { name: 'Pipelines 🔵', color: '#38c878' },
                { name: 'Conflict arcs', color: '#e8a838' },
                { name: 'Nuclear ☢️', color: '#e67e22' },
                { name: 'Intelligence 🕵', color: '#3498db' },
                { name: 'Sanctions 🚫', color: '#9b59b6' },
                { name: 'Cables 🔗', color: '#00cec9' },
            ];
            layers.forEach(function (l, i) {
                var lbl = document.createElement('label');
                var cb = document.createElement('input');
                cb.type = 'checkbox'; cb.checked = true;
                var dot = document.createElement('span');
                dot.className = 'layer-dot';
                dot.style.background = l.color;
                dot.style.boxShadow = '0 0 4px ' + l.color;
                lbl.appendChild(cb);
                lbl.appendChild(dot);
                lbl.appendChild(document.createTextNode(' ' + l.name));
                (i < 4 ? right : left).appendChild(lbl);
            });
        }
    }

    // ═══ HIDE / SHOW MAP ═══
    function initHideMap() {
        var btn = document.getElementById('btn-hide-map');
        var section = document.getElementById('globe-section');
        var shown = true;
        btn.onclick = function () {
            shown = !shown;
            section.style.height = shown ? '' : '0';
            section.style.minHeight = shown ? '' : '0';
            section.style.overflow = shown ? '' : 'hidden';
            btn.textContent = shown ? 'Hide Map 🗺' : 'Show Map 🗺';
        };

        document.getElementById('btn-2d').onclick = function () {
            this.classList.add('active');
            document.getElementById('btn-3d').classList.remove('active');
        };
        document.getElementById('btn-3d').onclick = function () {
            this.classList.add('active');
            document.getElementById('btn-2d').classList.remove('active');
        };
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
            var a = av(it);
            var t = th(it);
            var ago = timeAgoAr(it.pubDate);
            html += '<div class="news-item" data-idx="' + i + '">'
                + '<div class="news-time-col">'
                + '<span class="news-time">' + ago + '</span>'
                + '<img class="news-avatar" src="' + a + '" onerror="this.src=\'../public/logos/aljazeera.png\'">'
                + '</div>'
                + '<div class="news-content">'
                + '<div class="news-text">' + esc(it.title) + '</div>'
                + '<div class="news-src">' + esc(it.customName || it.sourceName || it.handle || '') + '</div>'
                + '</div>'
                + '<img class="news-thumb" src="' + t + '" onerror="this.src=\'' + a + '\'" loading="lazy">'
                + '</div>';
        }
        list.innerHTML = html;

        list.onclick = function (e) {
            var item = e.target.closest('.news-item');
            if (!item) return;
            openPopup(shown[parseInt(item.dataset.idx)]);
        };
    }

    function openPopup(it) {
        var popup = document.getElementById('news-popup');
        var body = document.getElementById('popup-body');
        if (!popup || !body) return;

        var a = av(it);
        var media = it.localMedia ? '../' + it.localMedia : it.mediaUrl;
        body.innerHTML =
            '<div class="popup-title">' + esc(it.title) + '</div>'
            + '<div class="popup-meta">'
            + '<img class="popup-src-avatar" src="' + a + '">'
            + '<span class="popup-src-name">' + esc(it.customName || it.sourceName || '') + '</span>'
            + '<span class="popup-src-time">' + timeAgoAr(it.pubDate) + '</span>'
            + '</div>'
            + (media ? '<img class="popup-media" src="' + media + '" onerror="this.style.display=\'none\'">' : '')
            + (it.link ? '<a href="' + it.link + '" target="_blank" style="display:block;margin-top:14px;color:#d4a030;font-size:13px;text-decoration:none">فتح المصدر ↗</a>' : '');
        popup.classList.remove('hidden');
    }

    function initPopup() {
        var popup = document.getElementById('news-popup');
        document.getElementById('popup-close').onclick = function () { popup.classList.add('hidden'); };
        popup.querySelector('.popup-overlay').onclick = function () { popup.classList.add('hidden'); };
    }

    function fetchTG() {
        fetch(PROXY + '/telegram?channel=ajanews')
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d.ok && d.items) { merge(d.items); renderNews(); } })
            .catch(function () {});
    }
    function fetchTW() {
        fetch(STATIC + '?t=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d && d.items) { merge(d.items); renderNews(); } })
            .catch(function () {});
    }
    function loadNews() { fetchTG(); fetchTW(); }

    // ═══ LIVE TV ═══
    function initTV() {
        renderCarousel();
        playTV(0);
    }

    function renderCarousel() {
        var c = document.getElementById('tv-carousel');
        if (!c) return;
        var html = '';
        TV.forEach(function (ch, i) {
            var src = ch.logo || ('https://img.youtube.com/vi/' + ch.vid + '/mqdefault.jpg');
            html += '<div class="tv-card' + (i === curTV ? ' active' : '') + '" data-i="' + i + '">'
                + '<div class="live-dot">LIVE</div>'
                + '<img src="' + src + '" alt="' + ch.name + '">'
                + '<div class="ch-name">' + ch.name + '</div>'
                + '</div>';
        });
        c.innerHTML = html;
        c.onclick = function (e) {
            var card = e.target.closest('.tv-card');
            if (card) playTV(parseInt(card.dataset.i));
        };
    }

    function playTV(i) {
        curTV = i;
        var p = document.getElementById('tv-player');
        if (p) p.src = 'https://www.youtube.com/embed/' + TV[i].vid + '?autoplay=1&mute=0&rel=0&playsinline=1';
        document.querySelectorAll('.tv-card').forEach(function (c, j) { c.classList.toggle('active', j === i); });
    }

    // ═══ CLOCKS ═══
    function clocks() {
        var f = function (tz) { return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }); };
        var e;
        e = document.getElementById('clk-riyadh'); if (e) e.textContent = f('Asia/Riyadh');
        e = document.getElementById('clk-nyc'); if (e) e.textContent = f('America/New_York');
        e = document.getElementById('clk-london'); if (e) e.textContent = f('Europe/London');
    }

    // ═══ SYNC ═══
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

    // ═══ NAV ═══
    function initNav() {
        document.getElementById('bottom-nav').onclick = function (e) {
            var it = e.target.closest('.nav-item');
            if (!it) return;
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
            it.classList.add('active');
        };
    }

    // ═══ INIT ═══
    function init() {
        initGlobe();
        initPanels();
        initHideMap();
        initPopup();
        initSync();
        initNav();
        initTV();

        loadNews();
        setInterval(loadNews, 1000);
        clocks();
        setInterval(clocks, 1000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
