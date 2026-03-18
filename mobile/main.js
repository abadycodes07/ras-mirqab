/**
 * RAS MIRQAB MOBILE V57 — NUCLEAR REBIRTH
 * Main app logic: Wires up the shared desktop backend to the fresh mobile UI.
 * Implements: Bell panel, Globe 2D/3D, Hide Map, News (RTL), TV Carousel + PiP
 */

(function () {
    'use strict';

    /* ─────────────────────────────────────
       CONFIG & STATE
    ───────────────────────────────────── */
    const CFG = {
        channels: [
            { name: 'الجزيرة',   id: 'bNyUyrR0PHo' },
            { name: 'العربية',   id: 'n7eQejkXbnM' },
            { name: 'الحدث',     id: 'xWXpl7azI8k' },
            { name: 'TRT World', id: 'U--OjmpjF5o' },
            { name: 'TRT Arabic', id: 'p0m0h94C0f8' },
        ],
        logoBase: '../public/logos/',
        pipThreshold: 380, // px scrolled to auto-activate PiP
    };

    const state = {
        activeChannelId: null,
        isPip: false,
        pipChannel: null,
        mapVisible: true,
        currentView: '3d',
    };

    /* ─────────────────────────────────────
       INIT
    ───────────────────────────────────── */
    function init() {
        console.log('%c🚀 RAS MIRQAB MOBILE V57 REBIRTH', 'color:#d47b4a; font-weight:900; font-size:14px;');
        initGlobe();
        initTV();
        initNews();
        initWidgets();
        bindHeaderEvents();
        bindGlobeControls();
        bindScrollPiP();
        bindNavItems();
    }

    /* ─────────────────────────────────────
       GLOBE
    ───────────────────────────────────── */
    function initGlobe() {
        if (window.RasMirqabGlobe) {
            try { RasMirqabGlobe.init(); } catch (e) { console.warn('Globe init:', e); }
        }
    }

    /* ─────────────────────────────────────
       GLOBE CONTROLS
    ───────────────────────────────────── */
    function bindGlobeControls() {
        // 2D / 3D Toggle
        document.querySelectorAll('.dim-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view === state.currentView) return;
                state.currentView = view;
                document.querySelectorAll('.dim-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (window.RasMirqabGlobe && RasMirqabGlobe.toggleView) {
                    RasMirqabGlobe.toggleView(view);
                }
            });
        });

        // Hide Map
        document.getElementById('pill-hidemap')?.addEventListener('click', () => {
            state.mapVisible = false;
            document.body.classList.add('map-hidden');
        });

        // Show Map (bookmark button)
        document.getElementById('show-map-bm')?.addEventListener('click', () => {
            state.mapVisible = true;
            document.body.classList.remove('map-hidden');
        });

        // Layers modal
        document.getElementById('pill-layers')?.addEventListener('click', () => {
            document.getElementById('layers-modal').classList.add('open');
            buildLayersList();
        });
        document.getElementById('layers-close')?.addEventListener('click', () => {
            document.getElementById('layers-modal').classList.remove('open');
        });
    }

    function buildLayersList() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        if (!window.RasMirqabData || !RasMirqabData.categories) {
            list.innerHTML = '<div style="color:#555; text-align:center; font-size:12px;">لا تتوفر طبقات</div>';
            return;
        }
        list.innerHTML = Object.entries(RasMirqabData.categories).map(([key, cat]) => {
            const checked = window.RasMirqabGlobe?.activeLayers?.[key] !== false;
            return `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <label style="display:flex;align-items:center;gap:12px;cursor:pointer;flex:1;">
                    <input type="checkbox" data-layer="${key}" ${checked ? 'checked' : ''}
                        style="accent-color:var(--orange); width:16px; height:16px;"
                        onchange="window.__M57.toggleLayer('${key}', this.checked)">
                    <span style="font-size:14px; font-weight:700;">${cat.emoji} ${cat.labelAr}</span>
                </label>
            </div>`;
        }).join('');
    }

    window.__M57 = window.__M57 || {};
    window.__M57.toggleLayer = function (key, val) {
        if (window.RasMirqabGlobe) {
            RasMirqabGlobe.activeLayers = RasMirqabGlobe.activeLayers || {};
            RasMirqabGlobe.activeLayers[key] = val;
            if (RasMirqabGlobe.updateGlobeMarkers) RasMirqabGlobe.updateGlobeMarkers();
        }
    };

    /* ─────────────────────────────────────
       BELL / NOTIFICATION PANEL
       (Replicates the desktop bell popup)
    ───────────────────────────────────── */
    function bindHeaderEvents() {
        const bellBtn = document.getElementById('bell-btn');
        const panel   = document.getElementById('notif-panel');
        if (!bellBtn || !panel) return;

        // Toggle
        bellBtn.addEventListener('click', e => {
            e.stopPropagation();
            panel.classList.toggle('open');
        });

        // Close on outside tap
        document.addEventListener('touchstart', e => {
            if (!panel.contains(e.target) && e.target !== bellBtn) {
                panel.classList.remove('open');
            }
        });

        // Volume slider display (mirrors desktop)
        const volSlider = document.getElementById('vol-slider');
        const soundSw   = document.getElementById('sw-audio');
        if (volSlider && soundSw) {
            soundSw.addEventListener('change', () => {
                volSlider.parentElement.style.opacity = soundSw.checked ? '1' : '0.4';
            });
        }
    }

    /* ─────────────────────────────────────
       NEWS — LINKS to BreakingNewsWidget
    ───────────────────────────────────── */
    function initNews() {
        if (!window.BreakingNewsWidget) return;

        const feed = document.getElementById('news-feed');
        const syncBtn = document.getElementById('sync-btn');

        // Register the mobile render override (exact RTL mockup layout)
        window.BreakingNewsWidget.renderOverride = (container, items) => {
            if (!container) return;
            container.innerHTML = items.slice(0, 50).map(item => {
                const date = item.pubDate ? new Date(item.pubDate) : new Date();
                const timeStr = date.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });
                const handle = (item.sourceHandle || 'default').toLowerCase();
                const source = (item.source || 'rss').toLowerCase();

                const logo = `${CFG.logoBase}${handle}.jpg`;
                const fallback = `${CFG.logoBase}default.png`;

                // Badge class
                const badgeCls = source === 'telegram' ? 'tg' : source === 'twitter' ? 'tw' : 'rss';
                const badgeChar = source === 'telegram' ? 'T' : source === 'twitter' ? '𝕏' : '⊕';

                // Thumbnail
                const thumb = item.mediaUrl || item.image || (item.media?.[0]?.url) || null;

                return `
                <div class="news-item" onclick="window.open('${item.link}','_blank')">
                    <!-- Right: source + time -->
                    <div class="news-meta-r">
                        <span class="news-time">${timeStr}</span>
                        <div class="news-logo-wrap">
                            <img src="${logo}" onerror="this.src='${fallback}'" class="news-logo">
                            <span class="news-badge ${badgeCls}">${badgeChar}</span>
                        </div>
                    </div>
                    <!-- Center: headline -->
                    <div class="news-headline">${item.title || ''}</div>
                    <!-- Left: thumbnail -->
                    ${thumb ? `<img src="${thumb}" class="news-thumb" onerror="this.style.display='none'">` : ''}
                </div>`;
            }).join('');
        };

        // Sync button
        syncBtn?.addEventListener('click', () => {
            syncBtn.querySelector('i').style.animation = 'spin 0.6s linear';
            setTimeout(() => { syncBtn.querySelector('i').style.animation = ''; }, 700);
            window.BreakingNewsWidget.fetchServerCache
                ? window.BreakingNewsWidget.fetchServerCache()
                : window.location.reload();
        });

        // Init + fetch
        window.BreakingNewsWidget.init();
        if (window.BreakingNewsWidget.fetchServerCache) {
            window.BreakingNewsWidget.fetchServerCache();
        }
    }

    /* ─────────────────────────────────────
       TV CAROUSEL
    ───────────────────────────────────── */
    function initTV() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        carousel.innerHTML = CFG.channels.map(ch => `
            <div class="tv-card glass" data-id="${ch.id}" id="tv-${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" class="tv-thumb">
                <span class="tv-live-badge">LIVE</span>
                <span class="tv-channel-name">${ch.name}</span>
                <div class="tv-player-wrap" id="player-${ch.id}"></div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-card').forEach(card => {
            card.addEventListener('click', () => playTV(card.dataset.id));
        });

        // Arrow nav
        document.getElementById('tv-left')?.addEventListener('click', () => {
            carousel.scrollBy({ left: -160, behavior: 'smooth' });
        });
        document.getElementById('tv-right')?.addEventListener('click', () => {
            carousel.scrollBy({ left: 160, behavior: 'smooth' });
        });

        // Auto-play first (muted)
        setTimeout(() => playTV(CFG.channels[0].id, true), 1200);
    }

    function playTV(id, muted = false) {
        // If same channel, toggle off
        if (state.activeChannelId === id && !muted) {
            stopTV();
            return;
        }

        // Stop others
        stopTV(false);

        state.activeChannelId = id;
        state.pipChannel = id;

        const card   = document.getElementById(`tv-${id}`);
        const player = document.getElementById(`player-${id}`);
        if (!card || !player) return;

        card.classList.add('playing');
        player.style.display = 'block';
        player.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&controls=1" allow="autoplay" allowfullscreen></iframe>`;
    }

    function stopTV(clearState = true) {
        document.querySelectorAll('.tv-card').forEach(c => c.classList.remove('playing'));
        document.querySelectorAll('.tv-player-wrap').forEach(p => {
            p.style.display = 'none';
            p.innerHTML = '';
        });
        if (clearState) {
            state.activeChannelId = null;
        }
    }

    /* ─────────────────────────────────────
       PiP — Auto-Detach on Scroll
    ───────────────────────────────────── */
    function bindScrollPiP() {
        const pip   = document.getElementById('pip-window');
        const frame = document.getElementById('pip-frame');
        const close = document.getElementById('pip-close');

        close?.addEventListener('click', () => {
            pip.classList.remove('active');
            frame.innerHTML = '';
            state.isPip = false;
            state.activeChannelId = null;
        });

        window.addEventListener('scroll', () => {
            if (!state.pipChannel) return;

            const tvSection = document.getElementById('tv-carousel');
            if (!tvSection) return;
            const rect = tvSection.getBoundingClientRect();
            const tvGone = rect.bottom < 0; // carousel scrolled off top

            if (tvGone && !state.isPip) {
                // Activate PiP
                state.isPip = true;
                frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${state.pipChannel}?autoplay=1&mute=0&controls=0" allow="autoplay"></iframe>`;
                pip.classList.add('active');
            } else if (!tvGone && state.isPip) {
                // Return to carousel
                state.isPip = false;
                pip.classList.remove('active');
                frame.innerHTML = '';
            }
        }, { passive: true });

        // Draggable PiP
        let ox = 0, oy = 0;
        pip.addEventListener('touchstart', e => {
            const t = e.touches[0];
            ox = t.clientX - pip.offsetLeft;
            oy = t.clientY - pip.offsetTop;
        }, { passive: true });
        pip.addEventListener('touchmove', e => {
            const t = e.touches[0];
            pip.style.left = Math.max(0, Math.min(window.innerWidth - pip.offsetWidth, t.clientX - ox)) + 'px';
            pip.style.top  = Math.max(0, Math.min(window.innerHeight - pip.offsetHeight, t.clientY - oy)) + 'px';
        }, { passive: true });
    }

    /* ─────────────────────────────────────
       WIDGETS — World Clocks + Market
    ───────────────────────────────────── */
    function initWidgets() {
        // World Clocks
        const clockBody = document.getElementById('clocks-body');
        if (clockBody) {
            const cities = [
                { label: 'NYC',    tz: 'America/New_York' },
                { label: 'London', tz: 'Europe/London' },
                { label: 'Kuwait', tz: 'Asia/Kuwait' },
            ];
            const updateClocks = () => {
                clockBody.innerHTML = cities.map(c => {
                    const t = new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: c.tz
                    });
                    return `<div class="clock-row"><span class="clock-city">${c.label}</span><span class="clock-time">${t}</span></div>`;
                }).join('');
            };
            updateClocks();
            setInterval(updateClocks, 15000);
        }

        // Gold via TradingView REST
        const priceEl  = document.getElementById('market-price');
        const changeEl = document.getElementById('market-change');
        if (priceEl) {
            fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d')
                .then(r => r.json())
                .then(data => {
                    const r = data?.chart?.result?.[0];
                    if (!r) return;
                    const close   = r.indicators.quote[0].close;
                    const last    = close[close.length - 1];
                    const prev    = close[close.length - 2] || last;
                    const pct     = ((last - prev) / prev * 100).toFixed(2);
                    const sign    = pct >= 0 ? '+' : '';
                    priceEl.textContent  = last.toFixed(1);
                    priceEl.style.color  = pct >= 0 ? '#2ecc71' : '#e74c3c';
                    changeEl.textContent = `${sign}${pct}% — ذهب`;
                })
                .catch(() => {
                    priceEl.textContent  = '—';
                    changeEl.textContent = 'ذهب / دولار';
                });
        }
    }

    /* ─────────────────────────────────────
       BOTTOM NAV
    ───────────────────────────────────── */
    function bindNavItems() {
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
