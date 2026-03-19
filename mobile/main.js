/**
 * RAS MIRQAB MOBILE V57.3 — main.js
 * Fixes: news popup, Arabic relative time, compact gold, layers backdrop close,
 *        logo path fix, 2D/3D via globe.js API (data-dim + .dimension-toggle)
 */

(function () {
    'use strict';

    const CFG = {
        channels: [
            { name: 'الجزيرة',   id: 'bNyUyrR0PHo' },
            { name: 'العربية',   id: 'n7eQejkXbnM' },
            { name: 'الحدث',     id: 'xWXpl7azI8k' },
            { name: 'TRT World', id: 'U--OjmpjF5o' },
            { name: 'TRT Arabic',id: 'p0m0h94C0f8' },
            { name: 'Sky News',  id: 'Xbzz3X-8SKE' },
        ],
        logoBase: '../public/logos/',
    };

    const state = { activeChannelId: null, pipChannel: null, isPip: false };

    // Source-handle → logo file mapping (exact filenames in /public/logos/)
    const LOGO_MAP = {
        'ajanews':          'ajanews.webp',
        'alhadath_brk':     'alhadath_brk.png',
        'alarabiya_brk':    'alarabiya.png',
        'asharqnewsbrk':    'asharq.png',
        'alekhbariyanews':  'alekhbariyanews.jpg',
        'rt_arabic':        'rt.png',
        'sabq_news':        'kbsalsaud.png',
        'ajelnews24':       'ajelnews.jpg',
        'skynewsarabia_breaking': 'skynews.png',
        'rss-app':          'rss-app',      // special: no logo
        'aljazeera':        'aljazeera.png',
        'alarabiya':        'alarabiya.png',
        'alhadath':         'alhadath3.png',
        'skynews_ar':       'skynews.png',
        'default':          'aljazeera.png',
    };

    function getLogoSrc(handle, source) {
        if (!handle) return CFG.logoBase + 'aljazeera.png';
        const key = handle.toLowerCase();
        const file = LOGO_MAP[key];
        if (!file || file === 'rss-app') return CFG.logoBase + 'aljazeera.png';
        return CFG.logoBase + file;
    }

    /* ─── Arabic relative time ─── */
    function arabicRelativeTime(dateStr) {
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        if (isNaN(then)) return '';
        const diff = Math.floor((now - then) / 1000); // seconds ago
        if (diff < 60) return 'الآن';
        if (diff < 3600) {
            const m = Math.floor(diff / 60);
            return `منذ ${m} ${m === 1 ? 'دقيقة' : 'دقائق'}`;
        }
        const h = Math.floor(diff / 3600);
        if (h < 24) return `منذ ${h} ${h === 1 ? 'ساعة' : 'ساعات'}`;
        const d = Math.floor(h / 24);
        return `منذ ${d} ${d === 1 ? 'يوم' : 'أيام'}`;
    }

    /* ─── Init ─── */
    function init() {
        console.log('%c🚀 RAS MIRQAB V57.3', 'color:#d47b4a;font-weight:900;');
        initGlobe();
        buildTV();
        initNews();
        initWidgets();
        bindBell();
        bindGlobeControls();
        bindScrollPiP();
        bindNav();
        bindNewsModal();
    }

    /* ─── Globe ─── */
    function initGlobe() {
        if (window.RasMirqabGlobe) {
            try { RasMirqabGlobe.init(); } catch (e) { console.warn('Globe:', e); }
        }
    }

    /* ─── Globe Controls ─── */
    function bindGlobeControls() {
        // NOTE: 2D/3D toggle is handled by globe.js initDimensionToggle()
        // which targets .dimension-toggle > .dim-btn[data-dim]
        // We just need Hide Map and Layers

        // Hide Map
        document.getElementById('pill-hidemap')?.addEventListener('click', () => {
            document.body.classList.add('map-hidden');
        });

        // Show Map bookmark
        document.getElementById('show-map-bm')?.addEventListener('click', () => {
            document.body.classList.remove('map-hidden');
        });

        // Layers panel
        const layersPanel = document.getElementById('layers-panel');
        const layersBackdrop = document.getElementById('layers-backdrop');
        document.getElementById('pill-layers')?.addEventListener('click', () => {
            layersPanel.classList.add('open');
            layersBackdrop.style.display = 'block';
            buildLayers();
        });
        const closeLayersFn = () => {
            layersPanel.classList.remove('open');
            layersBackdrop.style.display = 'none';
        };
        document.getElementById('layers-close')?.addEventListener('click', closeLayersFn);
        layersBackdrop?.addEventListener('click', closeLayersFn);
    }

    function buildLayers() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        const data = window.RasMirqabData;
        if (!data || !data.categories) {
            list.innerHTML = '<div style="color:var(--t-muted);padding:16px 10px;font-size:12px;">لا توجد طبقات</div>';
            return;
        }
        list.innerHTML = Object.entries(data.categories).map(([key, cat]) => {
            const on = window.RasMirqabGlobe?.activeLayers?.[key] !== false;
            return `
            <label class="layer-row" onclick="__M573.toggleLayer('${key}',this.querySelector('input'))">
                <span>${cat.emoji || '●'} ${cat.labelAr || key}</span>
                <input type="checkbox" id="lyr-${key}" ${on ? 'checked' : ''}>
            </label>`;
        }).join('');
    }

    window.__M573 = {
        toggleLayer(key) {
            const cb = document.getElementById('lyr-' + key);
            if (!window.RasMirqabGlobe) return;
            RasMirqabGlobe.activeLayers = RasMirqabGlobe.activeLayers || {};
            RasMirqabGlobe.activeLayers[key] = cb ? !cb.checked : false;
            if (cb) cb.checked = RasMirqabGlobe.activeLayers[key];
            try {
                if (RasMirqabGlobe.updateGlobeMarkers) RasMirqabGlobe.updateGlobeMarkers();
                if (RasMirqabGlobe.refreshMarkers) RasMirqabGlobe.refreshMarkers();
            } catch(e) {}
        }
    };

    /* ─── Bell ─── */
    function bindBell() {
        const btn = document.getElementById('bell-btn');
        const panel = document.getElementById('notif-panel');
        if (!btn || !panel) return;
        btn.addEventListener('click', e => { e.stopPropagation(); panel.classList.toggle('open'); });
        document.addEventListener('touchstart', e => {
            if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
        });
    }

    /* ─── News ─── */
    function initNews() {
        const feed = document.getElementById('news-feed');
        if (!feed) return;

        window.mobileRenderNews = function (items) {
            if (!items || !items.length) {
                feed.innerHTML = '<div class="loading-row" style="color:var(--t-muted);">لا توجد أخبار حتى الآن</div>';
                return;
            }
            // Store for popup use
            window._mobileNewsItems = items;

            feed.innerHTML = items.slice(0, 60).map((item, idx) => {
                const relTime  = arabicRelativeTime(item.pubDate);
                const handle   = (item.sourceHandle || 'default').toLowerCase();
                const source   = (item.source || 'rss').toLowerCase();
                const logoSrc  = getLogoSrc(handle, source);
                const badgeCls = source === 'telegram' ? 'tg' : source === 'twitter' ? 'tw' : 'rss';
                const badge    = source === 'telegram'
                    ? '<img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" style="width:9px;height:9px;filter:brightness(0) invert(1);">'
                    : source === 'twitter' ? '𝕏' : '⊕';
                const thumb = item.mediaUrl || item.image || null;

                return `
                <div class="news-item" onclick="__M573.openNews(${idx})">
                    <div class="news-meta-r">
                        <span class="news-time">${relTime}</span>
                        <div class="news-logo-wrap">
                            <img src="${logoSrc}" onerror="this.src='${CFG.logoBase}aljazeera.png'" class="news-logo">
                            <span class="news-badge ${badgeCls}">${badge}</span>
                        </div>
                    </div>
                    <div class="news-headline">${item.title || ''}</div>
                    ${thumb ? `<img src="${thumb}" class="news-thumb" onerror="this.style.display='none'">` : ''}
                </div>`;
            }).join('');
        };

        // Open popup
        window.__M573.openNews = function (idx) {
            const items = window._mobileNewsItems || [];
            const item = items[idx];
            if (!item) return;

            const modal = document.getElementById('news-modal');
            const handle = (item.sourceHandle || 'default').toLowerCase();
            const logoSrc = getLogoSrc(handle, item.source);

            const mediaEl = document.getElementById('nm-media');
            const thumb = item.mediaUrl || item.image || null;
            mediaEl.src = thumb || '';
            mediaEl.style.display = thumb ? 'block' : 'none';

            document.getElementById('nm-logo').src = logoSrc;
            document.getElementById('nm-source').textContent = item.sourceName || handle;
            document.getElementById('nm-time').textContent = arabicRelativeTime(item.pubDate);
            document.getElementById('nm-title').textContent = item.title || '';
            document.getElementById('nm-link').href = item.link || '#';

            modal.classList.add('open');
        };

        // Hook BreakingNewsWidget
        if (window.BreakingNewsWidget) {
            window.BreakingNewsWidget.renderOverride = (container, items) => window.mobileRenderNews(items);
            window.BreakingNewsWidget.init();
        }

        // Fetch news.json cache
        fetchNewsCache();

        // Sync button
        document.getElementById('sync-btn')?.addEventListener('click', () => {
            const ico = document.querySelector('#sync-btn i');
            if (ico) { ico.style.animation = 'spin 0.6s linear'; setTimeout(() => ico.style.animation='', 700); }
            fetchNewsCache();
            if (window.BreakingNewsWidget?.fetchServerCache) window.BreakingNewsWidget.fetchServerCache();
        });

        // Keep refreshing every 10s
        setInterval(fetchNewsCache, 10000);
    }

    async function fetchNewsCache() {
        const paths = [
            '../public/news.json',
            '/public/news.json',
            'https://abadycodes07.github.io/ras-mirqab/public/news.json',
        ];
        for (const p of paths) {
            try {
                const res = await fetch(p + '?t=' + Date.now());
                if (!res.ok) continue;
                const data = await res.json();
                if (data && data.length > 0) {
                    window.mobileRenderNews && window.mobileRenderNews(data);
                    localStorage.setItem('rasmirqab_bn_cache', JSON.stringify(data));
                    return;
                }
            } catch (e) {}
        }
        // localStorage fallback
        try {
            const lsc = JSON.parse(localStorage.getItem('rasmirqab_bn_cache') || 'null');
            if (lsc && lsc.length) { window.mobileRenderNews && window.mobileRenderNews(lsc); }
        } catch (e) {}
    }

    /* ─── News Modal Close ─── */
    function bindNewsModal() {
        const modal = document.getElementById('news-modal');
        document.getElementById('news-modal-close')?.addEventListener('click', () => modal.classList.remove('open'));
        modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
    }

    /* ─── TV Carousel ─── */
    function buildTV() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;
        carousel.innerHTML = CFG.channels.map(ch => `
            <div class="tv-card glass" data-id="${ch.id}" id="tv-${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" class="tv-thumb" onerror="this.style.opacity='0.2'">
                <span class="tv-live-badge">LIVE</span>
                <span class="tv-channel-name">${ch.name}</span>
                <div class="tv-player-wrap" id="player-${ch.id}"></div>
            </div>`).join('');

        carousel.querySelectorAll('.tv-card').forEach(card => {
            card.addEventListener('click', () => playTV(card.dataset.id));
        });

        document.getElementById('tv-left')?.addEventListener('click', () =>
            carousel.scrollBy({ left: -155, behavior: 'smooth' }));
        document.getElementById('tv-right')?.addEventListener('click', () =>
            carousel.scrollBy({ left: 155, behavior: 'smooth' }));

        // Auto-play Al Jazeera (unmuted — requires user gesture on most mobile browsers)
        setTimeout(() => playTV(CFG.channels[0].id, false), 1500);
    }

    function playTV(id, muted = false) {
        if (state.activeChannelId && state.activeChannelId !== id) stopTV(false);
        state.activeChannelId = id;
        state.pipChannel = id;
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('playing'));
        const card = document.getElementById(`tv-${id}`);
        const player = document.getElementById(`player-${id}`);
        if (!card || !player) return;
        card.classList.add('playing');
        player.style.display = 'block';
        player.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted?1:0}&controls=1&rel=0&playsinline=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    }

    function stopTV(clearState = true) {
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('playing'));
        document.querySelectorAll('.tv-player-wrap').forEach(p => { p.style.display='none'; p.innerHTML=''; });
        if (clearState) state.activeChannelId = null;
    }

    /* ─── PiP ─── */
    function bindScrollPiP() {
        const pip = document.getElementById('pip-window');
        const frame = document.getElementById('pip-frame');
        document.getElementById('pip-close')?.addEventListener('click', () => {
            pip.classList.remove('active'); frame.innerHTML = '';
            state.isPip = false; state.activeChannelId = null;
        });
        window.addEventListener('scroll', () => {
            if (!state.pipChannel) return;
            const carousel = document.getElementById('tv-carousel');
            if (!carousel) return;
            const tvGone = carousel.getBoundingClientRect().bottom < 0;
            if (tvGone && !state.isPip) {
                state.isPip = true;
                frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${state.pipChannel}?autoplay=1&mute=0&controls=0&playsinline=1" allow="autoplay" allowfullscreen></iframe>`;
                pip.classList.add('active');
            } else if (!tvGone && state.isPip) {
                state.isPip = false; pip.classList.remove('active'); frame.innerHTML = '';
            }
        }, { passive: true });
        // Draggable PiP
        let ox=0, oy=0;
        pip?.addEventListener('touchstart', e => { ox=e.touches[0].clientX-pip.offsetLeft; oy=e.touches[0].clientY-pip.offsetTop; }, { passive:true });
        pip?.addEventListener('touchmove', e => {
            pip.style.left = Math.max(0, Math.min(window.innerWidth-pip.offsetWidth, e.touches[0].clientX-ox))+'px';
            pip.style.top  = Math.max(0, Math.min(window.innerHeight-pip.offsetHeight, e.touches[0].clientY-oy))+'px';
        }, { passive:true });
    }

    /* ─── Widgets ─── */
    function initWidgets() {
        initClocks();
        initGold();
    }

    function initClocks() {
        const body = document.getElementById('clocks-body');
        if (!body) return;
        const cities = [
            { flag: '🇸🇦', label: 'الرياض', tz: 'Asia/Riyadh' },
            { flag: '🇰🇼', label: 'الكويت', tz: 'Asia/Kuwait' },
            { flag: '🇺🇸', label: 'نيويورك', tz: 'America/New_York' },
        ];
        function tick() {
            body.innerHTML = cities.map(c => {
                const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: c.tz });
                return `<div class="clock-row">
                    <span class="clock-city"><span class="clock-flag">${c.flag}</span>${c.label}</span>
                    <span class="clock-time">${t}</span>
                </div>`;
            }).join('');
        }
        tick(); setInterval(tick, 15000);
    }

    /* Compact gold/silver via Yahoo Finance (no iframe, small rows) */
    async function initGold() {
        const body = document.getElementById('market-body');
        if (!body) return;

        body.innerHTML = `
        <div class="gold-mini-row">
            <span class="gold-sym">XAUUSD</span>
            <span class="gold-px" id="px-gold">—</span>
            <span class="gold-chg" id="chg-gold">ذهب</span>
        </div>
        <div class="gold-mini-row" style="margin-top:4px;">
            <span class="gold-sym">XAGUSD</span>
            <span class="gold-px" id="px-silver">—</span>
            <span class="gold-chg" id="chg-silver">فضة</span>
        </div>`;

        async function fetchPrice(symbol, pxId, chgId) {
            try {
                const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
                const data = await res.json();
                const r = data?.chart?.result?.[0];
                if (!r) return;
                const close = r.indicators.quote[0].close;
                const last = close[close.length - 1];
                const prev = close[close.length - 2] || last;
                const pct = ((last - prev) / prev * 100).toFixed(2);
                const el = document.getElementById(pxId);
                const chEl = document.getElementById(chgId);
                if (el) { el.textContent = last.toFixed(1); el.style.color = pct >= 0 ? '#2ecc71' : '#e74c3c'; }
                if (chEl) { chEl.textContent = `${pct >= 0 ? '+' : ''}${pct}%`; chEl.className = 'gold-chg ' + (pct >= 0 ? 'up' : 'dn'); }
            } catch (e) {}
        }

        fetchPrice('GC=F', 'px-gold', 'chg-gold');
        fetchPrice('SI=F', 'px-silver', 'chg-silver');
        setInterval(() => {
            fetchPrice('GC=F', 'px-gold', 'chg-gold');
            fetchPrice('SI=F', 'px-silver', 'chg-silver');
        }, 60000);
    }

    /* ─── Bottom Nav ─── */
    function bindNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    /* ─── Boot ─── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
