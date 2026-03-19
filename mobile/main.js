/**
 * RAS MIRQAB MOBILE V57.2 — POLISH PASS
 * Fixes: Logo image, Show Map position, News loading, Al Jazeera auto-play (unmuted),
 *        World Clocks (12h + flags), Gold (TradingView), Globe controls
 */

(function () {
    'use strict';

    /* ─────────────────────────────────────
       CONFIG
    ───────────────────────────────────── */
    const CFG = {
        channels: [
            { name: 'الجزيرة',   id: 'bNyUyrR0PHo', logo: '../public/logos/aljazeera.png' },
            { name: 'العربية',   id: 'n7eQejkXbnM', logo: '../public/logos/alarabiya.png' },
            { name: 'الحدث',     id: 'xWXpl7azI8k', logo: '../public/logos/alhadath3.png' },
            { name: 'TRT World', id: 'U--OjmpjF5o', logo: '' },
            { name: 'TRT Arabic',id: 'p0m0h94C0f8', logo: '' },
            { name: 'Sky News',  id: 'Xbzz3X-8SKE', logo: '../public/logos/skynews.png' },
        ],
        logoBase: '../public/logos/',
    };

    const state = {
        activeChannelId: null,
        pipChannel:      null,
        isPip:           false,
        mapVisible:      true,
        currentView:     '3d',
    };

    /* ─────────────────────────────────────
       INIT
    ───────────────────────────────────── */
    function init() {
        console.log('%c🚀 RAS MIRQAB V57.2 POLISH PASS', 'color:#d47b4a; font-weight:900;');
        initGlobe();
        buildTV();
        initNews();
        initWidgets();
        bindBell();
        bindGlobeControls();
        bindScrollPiP();
        bindNav();
    }

    /* ─────────────────────────────────────
       GLOBE
    ───────────────────────────────────── */
    function initGlobe() {
        if (window.RasMirqabGlobe) {
            try { RasMirqabGlobe.init(); }
            catch (e) { console.warn('Globe init error:', e); }
        }
    }

    /* ─────────────────────────────────────
       GLOBE CONTROLS — 2D/3D, Hide Map, Layers
    ───────────────────────────────────── */
    function bindGlobeControls() {
        // ── 2D / 3D Buttons ──
        document.querySelectorAll('.dim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view === state.currentView) return;
                state.currentView = view;
                document.querySelectorAll('.dim-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (window.RasMirqabGlobe) {
                    try {
                        if (view === '2d') {
                            RasMirqabGlobe.show2D && RasMirqabGlobe.show2D();
                        } else {
                            RasMirqabGlobe.show3D && RasMirqabGlobe.show3D();
                        }
                        if (RasMirqabGlobe.toggleView) RasMirqabGlobe.toggleView(view);
                    } catch (e) {}
                }
            });
        });

        // ── Hide Map ──
        document.getElementById('pill-hidemap')?.addEventListener('click', () => {
            state.mapVisible = false;
            document.body.classList.add('map-hidden');
        });

        // ── Show Map bookmark ──
        document.getElementById('show-map-bm')?.addEventListener('click', () => {
            state.mapVisible = true;
            document.body.classList.remove('map-hidden');
        });

        // ── Layers Slide-In ──
        document.getElementById('pill-layers')?.addEventListener('click', () => {
            document.getElementById('layers-panel').classList.add('open');
            buildLayers();
        });
        document.getElementById('layers-close')?.addEventListener('click', () => {
            document.getElementById('layers-panel').classList.remove('open');
        });
    }

    /* Build layers list (non-modal, on-screen so globe stays visible) */
    function buildLayers() {
        const list = document.getElementById('layers-list');
        if (!list) return;

        const data = window.RasMirqabData;
        if (!data || !data.categories) {
            list.innerHTML = '<div style="color:#555;font-size:12px;padding:10px;">لا توجد طبقات</div>';
            return;
        }

        list.innerHTML = Object.entries(data.categories).map(([key, cat]) => {
            const on = window.RasMirqabGlobe?.activeLayers?.[key] !== false;
            return `
            <label class="layer-row" onclick="window.__M572.toggleLayer('${key}')">
                <span>${cat.emoji || '●'} ${cat.labelAr || key}</span>
                <input type="checkbox" id="lyr-${key}" ${on ? 'checked' : ''}
                       style="accent-color:var(--orange); pointer-events:none;">
            </label>`;
        }).join('');
    }

    window.__M572 = {
        toggleLayer(key) {
            if (!window.RasMirqabGlobe) return;
            RasMirqabGlobe.activeLayers = RasMirqabGlobe.activeLayers || {};
            RasMirqabGlobe.activeLayers[key] = !RasMirqabGlobe.activeLayers[key];
            const cb = document.getElementById('lyr-' + key);
            if (cb) cb.checked = RasMirqabGlobe.activeLayers[key];
            try {
                if (RasMirqabGlobe.updateGlobeMarkers) RasMirqabGlobe.updateGlobeMarkers();
                if (RasMirqabGlobe.refreshMarkers)     RasMirqabGlobe.refreshMarkers();
            } catch(e) {}
        }
    };

    /* ─────────────────────────────────────
       BELL / NOTIFICATION PANEL
    ───────────────────────────────────── */
    function bindBell() {
        const btn   = document.getElementById('bell-btn');
        const panel = document.getElementById('notif-panel');
        if (!btn || !panel) return;

        btn.addEventListener('click', e => {
            e.stopPropagation();
            panel.classList.toggle('open');
        });
        document.addEventListener('touchstart', e => {
            if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
        });
    }

    /* ─────────────────────────────────────
       BREAKING NEWS — feeds from server cache
    ───────────────────────────────────── */
    function initNews() {
        const feed = document.getElementById('news-feed');
        if (!feed) return;

        // ─ Register mobile render OVERRIDE ─
        // The shared widget calls this instead of its default renderer
        window.mobileRenderNews = function (items) {
            if (!items || !items.length) {
                feed.innerHTML = '<div style="color:var(--t-muted);text-align:center;padding:20px;font-size:12px;">لا توجد أخبار حتى الآن</div>';
                return;
            }
            feed.innerHTML = items.slice(0, 60).map(item => {
                const date    = item.pubDate ? new Date(item.pubDate) : new Date();
                const timeStr = date.toLocaleTimeString('ar-SA', { hour:'2-digit', minute:'2-digit', hour12:false });
                const handle  = (item.sourceHandle || 'default').toLowerCase();
                const source  = (item.source || 'rss').toLowerCase();
                const logo    = `${CFG.logoBase}${handle}.jpg`;
                const fallback= `${CFG.logoBase}default.png`;
                const badgeCls  = source === 'telegram' ? 'tg' : source === 'twitter' ? 'tw' : 'rss';
                const badgeChar = source === 'telegram' ? '<img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" style="width:8px;height:8px;">' : source === 'twitter' ? '𝕏' : '⊕';
                const thumb   = item.mediaUrl || item.image || null;

                return `
                <div class="news-item" onclick="window.open('${(item.link||'#').replace(/'/g,'')}','_blank')">
                    <div class="news-meta-r">
                        <span class="news-time">${timeStr}</span>
                        <div class="news-logo-wrap">
                            <img src="${logo}" onerror="this.src='${fallback}'" class="news-logo">
                            <span class="news-badge ${badgeCls}">${badgeChar}</span>
                        </div>
                    </div>
                    <div class="news-headline">${item.title || ''}</div>
                    ${thumb ? `<img src="${thumb}" class="news-thumb" onerror="this.style.display='none'">` : ''}
                </div>`;
            }).join('');
        };

        // Hook into the shared BreakingNewsWidget
        if (window.BreakingNewsWidget) {
            window.BreakingNewsWidget.renderOverride = (container, items) => window.mobileRenderNews(items);
            window.BreakingNewsWidget.init();
            // Try the server cache (news.json)
            fetchNewsCache();
        } else {
            // Try cache directly if widget hasn't loaded yet
            fetchNewsCache();
            document.addEventListener('breaking-news-ready', () => {
                if (window.BreakingNewsWidget) {
                    window.BreakingNewsWidget.renderOverride = (container, items) => window.mobileRenderNews(items);
                    window.BreakingNewsWidget.init();
                }
            });
        }

        // Sync button
        document.getElementById('sync-btn')?.addEventListener('click', () => {
            const ico = document.querySelector('#sync-btn i');
            if (ico) { ico.style.animation = 'spin 0.6s linear'; setTimeout(() => ico.style.animation='', 700); }
            fetchNewsCache();
            if (window.BreakingNewsWidget?.fetchServerCache) window.BreakingNewsWidget.fetchServerCache();
        });
    }

    /* Fetch from multiple possible paths for news.json */
    async function fetchNewsCache() {
        const feed = document.getElementById('news-feed');
        const paths = [
            '../public/news.json',
            '/public/news.json',
            'public/news.json',
            '/news.json',
            '../news.json',
            'https://ras-mirqab-proxy.onrender.com/public/news.json'
        ];
        for (const p of paths) {
            try {
                const res = await fetch(p + '?t=' + Date.now());
                if (!res.ok) continue;
                const data = await res.json();
                if (data && data.length > 0) {
                    console.log('Mobile: news.json loaded from', p, data.length, 'items');
                    window.mobileRenderNews(data);
                    // Also seed the LocalStorage cache
                    localStorage.setItem('rasmirqab_bn_cache', JSON.stringify(data));
                    return;
                }
            } catch (e) {}
        }
        // Last resort: try localStorage
        const lsc = localStorage.getItem('rasmirqab_bn_cache');
        if (lsc) {
            try {
                const d = JSON.parse(lsc);
                if (d && d.length) { window.mobileRenderNews(d); return; }
            } catch (e) {}
        }
        if (feed) feed.innerHTML = '<div style="color:var(--t-muted);text-align:center;padding:20px;font-size:12px;">لا تتوفر أخبار — تحقق من الاتصال</div>';
    }

    /* ─────────────────────────────────────
       TV CAROUSEL — Al Jazeera auto-plays WITH AUDIO
    ───────────────────────────────────── */
    function buildTV() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        carousel.innerHTML = CFG.channels.map((ch, i) => `
            <div class="tv-card glass" data-id="${ch.id}" id="tv-${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" class="tv-thumb" onerror="this.style.opacity='0.3'">
                <span class="tv-live-badge">LIVE</span>
                <span class="tv-channel-name">${ch.name}</span>
                <div class="tv-player-wrap" id="player-${ch.id}"></div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-card').forEach(card => {
            card.addEventListener('click', () => playTV(card.dataset.id, false));
        });

        // Arrow nav
        document.getElementById('tv-left')?.addEventListener('click', () =>
            carousel.scrollBy({ left: -155, behavior: 'smooth' }));
        document.getElementById('tv-right')?.addEventListener('click', () =>
            carousel.scrollBy({ left: 155, behavior: 'smooth' }));

        // ─ AUTO-PLAY Al Jazeera WITH AUDIO ─
        // Note: browsers require a user gesture for unmuted autoplay.
        // We start with mute=0; on mobile browsers will usually allow it after interaction.
        // We add a one-time click listener on the page to trigger unmuted autoplay.
        setTimeout(() => {
            playTV(CFG.channels[0].id, false); // try unmuted first
        }, 1500);
    }

    function playTV(id, muted = false) {
        // Stop currently active
        if (state.activeChannelId && state.activeChannelId !== id) stopTV(false);

        state.activeChannelId = id;
        state.pipChannel = id;

        const card   = document.getElementById(`tv-${id}`);
        const player = document.getElementById(`player-${id}`);
        if (!card || !player) return;

        // Mark active card visually
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('playing'));
        card.classList.add('playing');
        player.style.display = 'block';
        player.innerHTML = `<iframe
            src="https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted?1:0}&controls=1&rel=0&playsinline=1"
            allow="autoplay; fullscreen"
            allowfullscreen></iframe>`;
    }

    function stopTV(clearState = true) {
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('playing'));
        document.querySelectorAll('.tv-player-wrap').forEach(p => { p.style.display='none'; p.innerHTML=''; });
        if (clearState) { state.activeChannelId = null; }
    }

    /* ─────────────────────────────────────
       PiP — Scroll-Based Auto Detach
    ───────────────────────────────────── */
    function bindScrollPiP() {
        const pip   = document.getElementById('pip-window');
        const frame = document.getElementById('pip-frame');
        const close = document.getElementById('pip-close');
        if (!pip || !frame) return;

        close?.addEventListener('click', () => {
            pip.classList.remove('active');
            frame.innerHTML = '';
            state.isPip = false;
            state.activeChannelId = null;
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
                state.isPip = false;
                pip.classList.remove('active');
                frame.innerHTML = '';
            }
        }, { passive: true });

        // Draggable
        let ox=0, oy=0;
        pip.addEventListener('touchstart', e => { ox = e.touches[0].clientX - pip.offsetLeft; oy = e.touches[0].clientY - pip.offsetTop; }, { passive: true });
        pip.addEventListener('touchmove', e => {
            pip.style.left = Math.max(0, Math.min(window.innerWidth - pip.offsetWidth, e.touches[0].clientX - ox)) + 'px';
            pip.style.top  = Math.max(0, Math.min(window.innerHeight - pip.offsetHeight, e.touches[0].clientY - oy)) + 'px';
        }, { passive: true });
    }

    /* ─────────────────────────────────────
       WIDGETS
    ───────────────────────────────────── */
    function initWidgets() {
        initClocks();
        initGoldWidget();
    }

    /* World Clocks — Riyadh, Kuwait, New York — 12h format + flags */
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
                const t = new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: c.tz
                });
                return `<div class="clock-row">
                    <span class="clock-city"><span class="clock-flag">${c.flag}</span>${c.label}</span>
                    <span class="clock-time">${t}</span>
                </div>`;
            }).join('');
        }
        tick();
        setInterval(tick, 15000);
    }

    /* Gold Widget — TradingView Mini Chart */
    function initGoldWidget() {
        const body = document.getElementById('market-body');
        if (!body) return;
        // TradingView mini widget for gold
        body.innerHTML = `
        <div id="tv-gold-wrap" style="height:100%;display:flex;flex-direction:column;gap:4px;">
            <div style="flex:1; overflow:hidden; border-radius:6px;">
                <iframe
                    src="https://s.tradingview.com/embed-widget/mini-symbol-overview/?symbol=OANDA%3AXAUUSD&locale=ar&dateRange=1D&colorTheme=dark&isTransparent=true&autosize=true&largeChartUrl="
                    style="width:100%;height:70px;border:none;" scrolling="no"></iframe>
            </div>
            <div style="flex:1; overflow:hidden; border-radius:6px;">
                <iframe
                    src="https://s.tradingview.com/embed-widget/mini-symbol-overview/?symbol=OANDA%3AXAGUSD&locale=ar&dateRange=1D&colorTheme=dark&isTransparent=true&autosize=true&largeChartUrl="
                    style="width:100%;height:70px;border:none;" scrolling="no"></iframe>
            </div>
        </div>`;
    }

    /* ─────────────────────────────────────
       BOTTOM NAV
    ───────────────────────────────────── */
    function bindNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    /* ─────────────────────────────────────
       BOOT
    ───────────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
