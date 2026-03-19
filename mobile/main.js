/**
 * RAS MIRQAB MOBILE V57.4 — main.js
 * Fixes: &rlm; stripped from news titles, news popup with logos + media,
 *        YouTube nocookie (fewer ads), autoplay unmuted attempt,
 *        news polling every 10 seconds.
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

    // Lowercase logo handle → file mapping
    const LOGO_MAP = {
        'ajanews':               'ajanews_new.png',
        'alhadath_brk':         'hadath.png',
        'alhadath':             'hadath.png',
        'alarabiya_brk':        'alarabiya.png',
        'alarabiya':            'alarabiya.png',
        'asharqnewsbrk':        'asharq2.jpg',
        'alekhbariyanews':      'alekhbariyanews.jpg',
        'alekhbariyabrk':       'alekhbariyabrk.jpg',
        'rt_arabic':            'rt.png',
        'rtonline_ar':          'rt.png',
        'sabq_news':            'kbsalsaud.png',
        'ajelnews24':           'ajelnews.jpg',
        'skynewsarabia_breaking':'skynews.png',
        'skynews_ar':           'skynews.png',
        'aljazeera':            'aljazeera.png',
        'rss-app':              'aljazeera.png',
        'twitter-list':         'alarabiya.png',
    };

    function logoSrc(handle) {
        if (!handle) return CFG.logoBase + 'aljazeera.png';
        const f = LOGO_MAP[handle.toLowerCase()];
        return CFG.logoBase + (f || 'aljazeera.png');
    }

    /* Strip RTL/LTR markers and HTML entities from text */
    function cleanText(str) {
        if (!str) return '';
        return str
            .replace(/&rlm;/gi, '')
            .replace(/&lrm;/gi, '')
            .replace(/[\u200F\u200E\u202A\u202B\u202C\u202D\u202E]/g, '')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .trim();
    }

    /* Arabic relative time */
    function relTime(dateStr) {
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (isNaN(diff) || diff < 0) return '';
        if (diff < 15) return 'الآن';
        if (diff < 60) return `قبل ${diff} ث`;
        const m = Math.floor(diff / 60);
        if (m === 1) return 'قبل دقيقة';
        if (m < 11) return `قبل ${m} دقائق`;
        if (m < 60) return `قبل ${m} دقيقة`;
        const h = Math.floor(m / 60);
        if (h === 1) return 'قبل ساعة';
        if (h < 11) return `قبل ${h} ساعات`;
        if (h < 24) return `قبل ${h} ساعة`;
        const d = Math.floor(h / 24);
        return d === 1 ? 'أمس' : `قبل ${d} أيام`;
    }

    function init() {
        console.log('%c🚀 RAS MIRQAB V57.4', 'color:#d47b4a;font-weight:900;');
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

    /* ─ Globe ─ */
    function initGlobe() {
        if (window.RasMirqabGlobe) {
            try { RasMirqabGlobe.init(); } catch(e) { console.warn('Globe:', e); }
        }
    }

    /* ─ Globe Controls ─ */
    function bindGlobeControls() {
        // NOTE: 2D/3D handled by globe.js initDimensionToggle() via .dimension-toggle + data-dim
        // Hide Map
        document.getElementById('pill-hidemap')?.addEventListener('click', () => {
            document.body.classList.add('map-hidden');
        });
        document.getElementById('show-map-bm')?.addEventListener('click', () => {
            document.body.classList.remove('map-hidden');
        });

        // Layers
        const panel    = document.getElementById('layers-panel');
        const backdrop = document.getElementById('layers-backdrop');
        const close = () => { panel.classList.remove('open'); backdrop.style.display = 'none'; };
        document.getElementById('pill-layers')?.addEventListener('click', () => {
            buildLayers(); panel.classList.add('open'); backdrop.style.display = 'block';
        });
        document.getElementById('layers-close')?.addEventListener('click', close);
        backdrop?.addEventListener('click', close);
    }

    function buildLayers() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        const data = window.RasMirqabData;
        if (!data || !data.categories) {
            list.innerHTML = '<div style="color:var(--t-muted);padding:14px 10px;font-size:12px;">لا توجد طبقات</div>';
            return;
        }
        list.innerHTML = Object.entries(data.categories).map(([key, cat]) => {
            const on = window.RasMirqabGlobe?.activeLayers?.[key] !== false;
            return `<label class="layer-row" onclick="__M574.toggleLayer('${key}')">
                <span>${cat.emoji || '●'} ${cat.labelAr || key}</span>
                <input type="checkbox" id="lyr-${key}" ${on ? 'checked' : ''}>
            </label>`;
        }).join('');
    }

    window.__M574 = {
        toggleLayer(key) {
            const cb = document.getElementById('lyr-' + key);
            if (!window.RasMirqabGlobe) return;
            RasMirqabGlobe.activeLayers = RasMirqabGlobe.activeLayers || {};
            const current = RasMirqabGlobe.activeLayers[key] !== false;
            RasMirqabGlobe.activeLayers[key] = !current;
            if (cb) cb.checked = RasMirqabGlobe.activeLayers[key];
            try {
                if (RasMirqabGlobe.updateGlobeMarkers) RasMirqabGlobe.updateGlobeMarkers();
                if (RasMirqabGlobe.refreshMarkers) RasMirqabGlobe.refreshMarkers();
            } catch(e) {}
        }
    };

    /* ─ Bell ─ */
    function bindBell() {
        const btn   = document.getElementById('bell-btn');
        const panel = document.getElementById('notif-panel');
        if (!btn || !panel) return;
        btn.addEventListener('click', e => { e.stopPropagation(); panel.classList.toggle('open'); });
        document.addEventListener('touchstart', e => {
            if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
        });
    }

    /* ─ News ─ */
    function initNews() {
        const feed = document.getElementById('news-feed');
        if (!feed) return;

        window.mobileRenderNews = function (items) {
            if (!items || !items.length) {
                feed.innerHTML = '<div class="loading-row" style="color:var(--t-muted);">لا توجد أخبار</div>';
                return;
            }
            window._mobileNewsItems = items;
            feed.innerHTML = items.slice(0, 80).map((item, idx) => {
                const handle  = (item.sourceHandle || 'default').toLowerCase();
                const source  = (item.source || 'rss').toLowerCase();
                const lSrc    = logoSrc(handle);
                const badgeCls= source === 'telegram' ? 'tg' : source === 'twitter' ? 'tw' : 'rss';
                const badge   = source === 'telegram'
                    ? '<img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" style="width:9px;height:9px;filter:brightness(0) invert(1);">'
                    : source === 'twitter' ? '𝕏' : '⊕';
                const thumb  = item.mediaUrl || item.image || null;
                const title  = cleanText(item.title || '');
                const rt     = relTime(item.pubDate);

                return `
                <div class="news-item" onclick="__M574.openNews(${idx})">
                    <div class="news-meta-r">
                        <span class="news-time">${rt}</span>
                        <div class="news-logo-wrap">
                            <img src="${lSrc}" onerror="this.src='${CFG.logoBase}aljazeera.png'" class="news-logo">
                            <span class="news-badge ${badgeCls}">${badge}</span>
                        </div>
                    </div>
                    <div class="news-headline">${title}</div>
                    ${thumb ? `<img src="${thumb}" class="news-thumb" onerror="this.style.display='none'">` : ''}
                </div>`;
            }).join('');
        };

        // Hook into shared widget
        if (window.BreakingNewsWidget) {
            window.BreakingNewsWidget.renderOverride = (container, items) => window.mobileRenderNews(items);
            window.BreakingNewsWidget.init();
        }

        // Direct cache fetch + refresh every 10 seconds
        fetchNewsCache();
        setInterval(fetchNewsCache, 10000);

        document.getElementById('sync-btn')?.addEventListener('click', () => {
            const ico = document.querySelector('#sync-btn i');
            if (ico) { ico.style.animation = 'spin 0.6s linear'; setTimeout(() => ico.style.animation='', 700); }
            fetchNewsCache();
        });

        window.__M574.openNews = openNewsModal;
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
                if (Array.isArray(data) && data.length > 0) {
                    window.mobileRenderNews && window.mobileRenderNews(data);
                    localStorage.setItem('rasmirqab_bn_cache', JSON.stringify(data));
                    return;
                }
            } catch(e) {}
        }
        // LocalStorage fallback
        try {
            const lsc = JSON.parse(localStorage.getItem('rasmirqab_bn_cache') || 'null');
            if (lsc && lsc.length) window.mobileRenderNews && window.mobileRenderNews(lsc);
        } catch(e) {}
    }

    /* ─ News Modal ─ */
    function openNewsModal(idx) {
        const items = window._mobileNewsItems || [];
        const item = items[idx];
        if (!item) return;

        const modal  = document.getElementById('news-modal');
        const handle = (item.sourceHandle || 'default').toLowerCase();
        const lSrc   = logoSrc(handle);
        const thumb  = item.mediaUrl || item.image || null;
        const title  = cleanText(item.title || '');

        // Media
        const mediaEl = document.getElementById('nm-media');
        if (thumb) {
            mediaEl.src = thumb;
            mediaEl.onload  = () => mediaEl.classList.add('loaded');
            mediaEl.onerror = () => mediaEl.classList.remove('loaded');
        } else {
            mediaEl.classList.remove('loaded');
            mediaEl.src = '';
        }

        // Logo
        const logoEl = document.getElementById('nm-logo');
        logoEl.src = lSrc;
        logoEl.onload  = () => logoEl.classList.add('loaded');
        logoEl.onerror = () => { logoEl.classList.remove('loaded'); };

        document.getElementById('nm-source').textContent = item.sourceName || handle || '';
        document.getElementById('nm-time').textContent   = relTime(item.pubDate);
        document.getElementById('nm-title').textContent  = title;
        const link = document.getElementById('nm-link');
        link.href = item.link || '#';
        link.style.display = (item.link && item.link !== '#') ? 'inline-block' : 'none';

        modal.classList.add('open');
    }

    function bindNewsModal() {
        const modal = document.getElementById('news-modal');
        document.getElementById('news-modal-close')?.addEventListener('click', () => modal.classList.remove('open'));
        modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
    }

    /* ─ TV Carousel — youtube-nocookie.com reduces ads ─ */
    function buildTV() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;
        carousel.innerHTML = CFG.channels.map(ch => `
            <div class="tv-card glass" data-id="${ch.id}" id="tv-${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" class="tv-thumb" onerror="this.style.opacity='.15'">
                <span class="tv-live-badge">LIVE</span>
                <span class="tv-channel-name">${ch.name}</span>
                <div class="tv-player-wrap" id="player-${ch.id}"></div>
            </div>`).join('');

        carousel.querySelectorAll('.tv-card').forEach(card =>
            card.addEventListener('click', () => playTV(card.dataset.id)));

        document.getElementById('tv-left')?.addEventListener('click', () =>
            carousel.scrollBy({ left: -140, behavior: 'smooth' }));
        document.getElementById('tv-right')?.addEventListener('click', () =>
            carousel.scrollBy({ left: 140, behavior: 'smooth' }));

        // Auto-play Al Jazeera — unmuted + nocookie
        setTimeout(() => playTV(CFG.channels[0].id, false), 1500);
    }

    function playTV(id, muted = false) {
        if (state.activeChannelId && state.activeChannelId !== id) stopTV(false);
        state.activeChannelId = id; state.pipChannel = id;
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('playing'));
        const card   = document.getElementById(`tv-${id}`);
        const player = document.getElementById(`player-${id}`);
        if (!card || !player) return;
        card.classList.add('playing'); player.style.display = 'block';
        // youtube-nocookie.com + modestbranding + no related videos
        player.innerHTML = `<iframe
            src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=${muted?1:0}&controls=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1"
            allow="autoplay; fullscreen; encrypted-media"
            allowfullscreen></iframe>`;
    }

    function stopTV(clearState = true) {
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('playing'));
        document.querySelectorAll('.tv-player-wrap').forEach(p => { p.style.display='none'; p.innerHTML=''; });
        if (clearState) state.activeChannelId = null;
    }

    /* ─ PiP ─ */
    function bindScrollPiP() {
        const pip   = document.getElementById('pip-window');
        const frame = document.getElementById('pip-frame');
        document.getElementById('pip-close')?.addEventListener('click', () => {
            pip.classList.remove('active'); frame.innerHTML = '';
            state.isPip = false; state.activeChannelId = null;
        });
        window.addEventListener('scroll', () => {
            if (!state.pipChannel) return;
            const tvGone = document.getElementById('tv-carousel')?.getBoundingClientRect().bottom < 0;
            if (tvGone && !state.isPip) {
                state.isPip = true;
                frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${state.pipChannel}?autoplay=1&mute=0&controls=0&playsinline=1&modestbranding=1" allow="autoplay" allowfullscreen></iframe>`;
                pip.classList.add('active');
            } else if (!tvGone && state.isPip) {
                state.isPip = false; pip.classList.remove('active'); frame.innerHTML = '';
            }
        }, { passive: true });
        let ox=0, oy=0;
        pip?.addEventListener('touchstart', e => { ox=e.touches[0].clientX-pip.offsetLeft; oy=e.touches[0].clientY-pip.offsetTop; }, { passive:true });
        pip?.addEventListener('touchmove', e => {
            pip.style.left = Math.max(0, Math.min(window.innerWidth-pip.offsetWidth, e.touches[0].clientX-ox))+'px';
            pip.style.top  = Math.max(0, Math.min(window.innerHeight-pip.offsetHeight, e.touches[0].clientY-oy))+'px';
        }, { passive:true });
    }

    /* ─ Widgets ─ */
    function initWidgets() { initClocks(); initGold(); }

    function initClocks() {
        const body = document.getElementById('clocks-body');
        if (!body) return;
        const cities = [
            { flag:'🇸🇦', label:'الرياض', tz:'Asia/Riyadh' },
            { flag:'🇰🇼', label:'الكويت', tz:'Asia/Kuwait' },
            { flag:'🇺🇸', label:'نيويورك', tz:'America/New_York' },
        ];
        function tick() {
            body.innerHTML = cities.map(c => {
                const t = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:c.tz });
                return `<div class="clock-row"><span class="clock-city"><span class="clock-flag">${c.flag}</span>${c.label}</span><span class="clock-time">${t}</span></div>`;
            }).join('');
        }
        tick(); setInterval(tick, 15000);
    }

    async function initGold() {
        const body = document.getElementById('market-body');
        if (!body) return;
        body.innerHTML = `
        <div class="gold-mini-row"><span class="gold-sym">XAUUSD</span><span class="gold-px" id="px-gold">—</span><span class="gold-chg" id="chg-gold">ذهب</span></div>
        <div class="gold-mini-row" style="margin-top:3px;"><span class="gold-sym">XAGUSD</span><span class="gold-px" id="px-silver">—</span><span class="gold-chg" id="chg-silver">فضة</span></div>`;

        async function fetchP(sym, pxId, chgId) {
            try {
                const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`);
                const d = await r.json();
                const rr = d?.chart?.result?.[0];
                if (!rr) return;
                const close = rr.indicators.quote[0].close;
                const last  = close[close.length-1], prev = close[close.length-2] || last;
                const pct   = ((last-prev)/prev*100).toFixed(2);
                const pxEl  = document.getElementById(pxId);
                const chEl  = document.getElementById(chgId);
                if (pxEl) { pxEl.textContent = last.toFixed(1); pxEl.style.color = pct>=0?'#2ecc71':'#e74c3c'; }
                if (chEl) { chEl.textContent = `${pct>=0?'+':''}${pct}%`; chEl.className='gold-chg '+(pct>=0?'up':'dn'); }
            } catch(e) {}
        }
        fetchP('GC=F','px-gold','chg-gold');
        fetchP('SI=F','px-silver','chg-silver');
        setInterval(() => { fetchP('GC=F','px-gold','chg-gold'); fetchP('SI=F','px-silver','chg-silver'); }, 60000);
    }

    /* ─ Bottom Nav ─ */
    function bindNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    /* ─ Boot ─ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }

})();
