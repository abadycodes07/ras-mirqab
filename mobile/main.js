/**
 * RAS MIRQAB MOBILE V57.5 — main.js
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
        serverBase: 'https://ras-mirqab-proxy.onrender.com',
    };

    const state = { activeChannelId: null, pipChannel: null, isPip: false };

    const LOGO_MAP = {
        'ajanews': 'ajanews_new.png', 'alhadath_brk': 'hadath.png', 'alhadath': 'hadath.png',
        'alarabiya_brk': 'alarabiya.png', 'alarabiya': 'alarabiya.png', 'asharqnewsbrk': 'asharq2.jpg',
        'alekhbariyanews': 'alekhbariyanews.jpg', 'alekhbariyabrk': 'alekhbariyabrk.jpg',
        'rt_arabic': 'rt.png', 'rtonline_ar': 'rt.png', 'sabq_news': 'kbsalsaud.png',
        'ajelnews24': 'ajelnews.jpg', 'skynewsarabia_breaking': 'skynews.png', 'skynews_ar': 'skynews.png',
        'aljazeera': 'aljazeera.png', 'rss-app': 'aljazeera.png',
        'alhadath': 'hadath.png', 'alhurra': 'alhurra.png', 'modgovksa': 'modgovksa2.png',
        'alhadasharq': 'asharq2.jpg', 'alHadath': 'hadath.png',
        // Twitter handles from AVATAR_MAP
        'asharqnewsbrk': 'asharq2.jpg', 'alhadath_x': 'hadath.png',
        'AlArabiya_Brk': 'alarabiya.png', 'SkyNewsArabia_B': 'skynews.png',
        'RT_Arabic': 'rt.png', 'alrougui': 'alrougui.jpg', 'ajmubasher': 'ajmubasher.png',
        'alekhbariyaews': 'alekhbariyanews.jpg', 'alekhbariyaBRK': 'alekhbariyabrk.jpg',
        'modgovksa': 'modgovksa2.png', 'newsnow4usa': 'newsnow.jpg', 'AJELNEWS2475': 'ajelnews.jpg',
    };

    function logoSrc(handle) {
        if (!handle) return CFG.logoBase + 'aljazeera.png';
        const f = LOGO_MAP[handle] || LOGO_MAP[handle.toLowerCase()];
        return CFG.logoBase + (f || 'aljazeera.png');
    }

    function cleanText(s) {
        if (!s) return '';
        return s.replace(/&rlm;/gi,'').replace(/&lrm;/gi,'').replace(/[\u200E\u200F\u202A-\u202E]/g,'')
                .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
                .replace(/https?:\/\/\S+/g, '')  // strip bare URLs from tweet text
                .replace(/\s{2,}/g, ' ').trim();
    }

    function relTime(d) {
        const dt = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
        if (isNaN(dt) || dt < 0) return '';
        if (dt < 15) return 'الآن';
        if (dt < 60) return `قبل ${dt} ث`;
        const m = Math.floor(dt/60);
        if (m===1) return 'قبل دقيقة';
        if (m<11) return `قبل ${m} دقائق`;
        if (m<60) return `قبل ${m} دقيقة`;
        const h = Math.floor(m/60);
        if (h===1) return 'قبل ساعة';
        if (h<11) return `قبل ${h} ساعات`;
        if (h<24) return `قبل ${h} ساعة`;
        const days = Math.floor(h/24);
        return days===1 ? 'أمس' : `قبل ${days} أيام`;
    }

    function init() {
        console.log('%c🚀 RAS MIRQAB V57.5', 'color:#d47b4a;font-weight:900;font-size:14px;');
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
        // 2D/3D: globe.js handles via .dimension-toggle + data-dim
        document.getElementById('pill-hidemap')?.addEventListener('click', () => {
            document.body.classList.add('map-hidden');
        });
        document.getElementById('show-map-btn')?.addEventListener('click', () => {
            document.body.classList.remove('map-hidden');
        });

        const panel    = document.getElementById('layers-panel');
        const backdrop = document.getElementById('layers-backdrop');
        const closeL = () => { panel.classList.remove('open'); backdrop.style.display='none'; };
        document.getElementById('pill-layers')?.addEventListener('click', () => {
            buildLayers(); panel.classList.add('open'); backdrop.style.display='block';
        });
        document.getElementById('layers-close')?.addEventListener('click', closeL);
        backdrop?.addEventListener('click', closeL);
    }

    function buildLayers() {
        const list = document.getElementById('layers-list');
        if (!list) return;
        const data = window.RasMirqabData;
        if (!data?.categories) { list.innerHTML='<div style="padding:14px;color:#666;font-size:12px;">لا توجد طبقات</div>'; return; }
        list.innerHTML = Object.entries(data.categories).map(([key, cat]) => {
            const on = window.RasMirqabGlobe?.activeLayers?.[key] !== false;
            return `<label class="layer-row" onclick="__M575.toggleLayer('${key}')">
                <span>${cat.emoji||'●'} ${cat.labelAr||key}</span>
                <input type="checkbox" id="lyr-${key}" ${on?'checked':''}>
            </label>`;
        }).join('');
    }

    window.__M575 = {
        toggleLayer(key) {
            const cb = document.getElementById('lyr-'+key);
            if (!window.RasMirqabGlobe) return;
            RasMirqabGlobe.activeLayers = RasMirqabGlobe.activeLayers || {};
            RasMirqabGlobe.activeLayers[key] = !(RasMirqabGlobe.activeLayers[key] !== false);
            if (cb) cb.checked = RasMirqabGlobe.activeLayers[key];
            try { RasMirqabGlobe.updateGlobeMarkers?.(); } catch(e) {}
        }
    };

    /* ─ Bell ─ */
    function bindBell() {
        const btn = document.getElementById('bell-btn');
        const panel = document.getElementById('notif-panel');
        if (!btn || !panel) return;
        btn.addEventListener('click', e => { e.stopPropagation(); panel.classList.toggle('open'); });
        document.addEventListener('touchstart', e => {
            if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
        });
    }

    /* ─ News rendering ─ */
    window.mobileRenderNews = function(items) {
        const feed = document.getElementById('news-feed');
        if (!feed) return;
        if (!items || !items.length) {
            feed.innerHTML = '<div class="loading-row" style="color:#444;">لا توجد أخبار حتى الآن</div>';
            return;
        }
        window._mobileNewsItems = items;
        feed.innerHTML = items.slice(0, 80).map((item, idx) => {
            const handle  = (item.sourceHandle || 'default').toLowerCase();
            const source  = (item.source || 'rss').toLowerCase();
            const lSrc    = logoSrc(handle);
            const badgeCls= source==='telegram'?'tg':source==='twitter'?'tw':'rss';
            const badge   = source==='telegram'
                ? '<i class="fab fa-telegram-plane"></i>'
                : source==='twitter' ? '<i class="fab fa-x-twitter" style="font-size:7px;"></i>' : '⊕';
            const thumb   = item.mediaUrl || item.image || null;
            const title   = cleanText(item.title || '');
            return `<div class="news-item" onclick="__M575.openNews(${idx})">
                <div class="news-meta">
                    <span class="news-time">${relTime(item.pubDate)}</span>
                    <div class="news-logo-wrap">
                        <img src="${lSrc}" onerror="this.src='${CFG.logoBase}aljazeera.png'" class="news-logo">
                        <span class="news-badge ${badgeCls}">${badge}</span>
                    </div>
                </div>
                <div class="news-headline">${title}</div>
                ${thumb?`<img src="${thumb}" class="news-thumb" onerror="this.style.display='none'">` : ''}
            </div>`;
        }).join('');
    };

    window.__M575.openNews = function(idx) {
        const item = (window._mobileNewsItems||[])[idx];
        if (!item) return;
        const modal  = document.getElementById('news-modal');
        const title  = cleanText(item.title||'');
        const lSrc   = logoSrc((item.sourceHandle||'').toLowerCase());
        const thumb  = item.mediaUrl || item.image || null;

        const mediaEl = document.getElementById('nm-media');
        if (thumb) { mediaEl.src=thumb; mediaEl.onload=()=>mediaEl.classList.add('show'); mediaEl.onerror=()=>mediaEl.classList.remove('show'); }
        else { mediaEl.src=''; mediaEl.classList.remove('show'); }

        const logoEl = document.getElementById('nm-logo');
        logoEl.src = lSrc;

        document.getElementById('nm-source').textContent = item.sourceName || item.sourceHandle || '';
        document.getElementById('nm-time').textContent   = relTime(item.pubDate);
        document.getElementById('nm-title').textContent  = title;
        const link = document.getElementById('nm-link');
        link.href = item.link || '#';
        link.style.display = (item.link && item.link!=='#') ? 'inline-block' : 'none';
        modal.classList.add('open');
    };

    /* ─ News Init ─ */
    function initNews() {
        // CACHE-FIRST: load localStorage immediately (synchronous, instant paint)
        try {
            const lsc = JSON.parse(localStorage.getItem('rasmirqab_bn_cache') || 'null');
            if (lsc && lsc.length) window.mobileRenderNews(lsc);
        } catch(e) {}

        if (window.BreakingNewsWidget) {
            window.BreakingNewsWidget.renderOverride = (_, items) => window.mobileRenderNews(items);
            window.BreakingNewsWidget.init();
        }
        // Then fetch fresh data from server
        fetchNewsCache();
        setInterval(fetchNewsCache, 10000);
        document.getElementById('sync-btn')?.addEventListener('click', () => {
            const ico = document.querySelector('#sync-btn i');
            if (ico) { ico.style.animation='spin 0.6s linear'; setTimeout(()=>ico.style.animation='',700); }
            fetchNewsCache();
        });
    }

    async function fetchNewsCache() {
        const paths = [
            CFG.serverBase + '/api/news-v4-list',           // live from Render server
            '../public/news.json',                           // local / GitHub Pages
            '/public/news.json',
            'https://abadycodes07.github.io/ras-mirqab/public/news.json',
        ];
        for (const p of paths) {
            try {
                const res = await fetch(p + (p.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache:'no-store' });
                if (!res.ok) continue;
                const data = await res.json();
                const items = Array.isArray(data) ? data : (data.items || []);
                if (items.length > 0) {
                    window.mobileRenderNews(items);
                    localStorage.setItem('rasmirqab_bn_cache', JSON.stringify(items));
                    return;
                }
            } catch(e) {}
        }
        // LocalStorage fallback
        try {
            const lsc = JSON.parse(localStorage.getItem('rasmirqab_bn_cache') || 'null');
            if (lsc?.length) window.mobileRenderNews(lsc);
        } catch(e) {}
    }

    /* ─ News Modal ─ */
    function bindNewsModal() {
        const m = document.getElementById('news-modal');
        document.getElementById('news-modal-close')?.addEventListener('click', () => m.classList.remove('open'));
        m?.addEventListener('click', e => { if (e.target===m) m.classList.remove('open'); });
    }

    /* ─ TV Carousel ─ */
    function buildTV() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;
        carousel.innerHTML = CFG.channels.map(ch => `
            <div class="tv-card glass" data-id="${ch.id}" id="tv-${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" class="tv-thumb" onerror="this.style.opacity='.15'">
                <span class="tv-badge">LIVE</span>
                <span class="tv-name">${ch.name}</span>
                <div class="tv-play-overlay"><div class="tv-play-icon"><i class="fas fa-play"></i></div></div>
                <div class="tv-player" id="player-${ch.id}"></div>
            </div>`).join('');

        // Clicks on overlay trigger playback (NOT on card itself to avoid iframe tap-through)
        carousel.querySelectorAll('.tv-play-overlay').forEach(ov =>
            ov.addEventListener('click', e => { e.stopPropagation(); playTV(ov.closest('.tv-card').dataset.id); }));
        carousel.querySelectorAll('.tv-card').forEach(c =>
            c.addEventListener('click', e => { if (!c.classList.contains('playing')) playTV(c.dataset.id); }));

        document.getElementById('tv-left')?.addEventListener('click', () =>
            carousel.scrollBy({ left:-150, behavior:'smooth' }));
        document.getElementById('tv-right')?.addEventListener('click', () =>
            carousel.scrollBy({ left:150, behavior:'smooth' }));

        // Al Jazeera auto-plays on first user interaction
        const startAJ = () => {
            playTV(CFG.channels[0].id, false);
            document.removeEventListener('touchstart', startAJ);
            document.removeEventListener('click', startAJ);
        };
        document.addEventListener('touchstart', startAJ, { once:true, passive:true });
        document.addEventListener('click', startAJ, { once:true });
        // Also try after a delay (some browsers allow unmuted autoplay)
        setTimeout(() => playTV(CFG.channels[0].id, true), 2000);
    }

    function playTV(id, muted=false) {
        // Stop previously playing channel
        if (state.activeChannelId && state.activeChannelId !== id) {
            const prevPlayer = document.getElementById('player-' + state.activeChannelId);
            const prevCard   = document.getElementById('tv-' + state.activeChannelId);
            if (prevPlayer) { prevPlayer.style.display='none'; prevPlayer.innerHTML=''; }
            if (prevCard)   { prevCard.classList.remove('playing'); }
        }
        state.activeChannelId = id;
        state.pipChannel = id;
        const card   = document.getElementById('tv-' + id);
        const player = document.getElementById('player-' + id);
        if (!card || !player) return;
        card.classList.add('playing');
        player.style.display = 'block';
        const origin = encodeURIComponent(window.location.origin || 'https://abadycodes07.github.io');
        player.innerHTML = `<iframe
            src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=${muted?1:0}&controls=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&origin=${origin}"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowfullscreen></iframe>`;
    }

    /* ─ PiP ─ */
    function bindScrollPiP() {
        const pip = document.getElementById('pip-window');
        const frame = document.getElementById('pip-frame');
        document.getElementById('pip-close')?.addEventListener('click', () => {
            pip.classList.remove('active'); frame.innerHTML='';
            state.isPip=false; state.activeChannelId=null;
        });
        window.addEventListener('scroll', () => {
            if (!state.pipChannel) return;
            const carousel = document.getElementById('tv-carousel');
            const tvGone = carousel?.getBoundingClientRect().bottom < 0;
            if (tvGone && !state.isPip) {
                state.isPip=true;
                frame.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${state.pipChannel}?autoplay=1&mute=0&controls=0&playsinline=1&modestbranding=1" allow="autoplay" allowfullscreen></iframe>`;
                pip.classList.add('active');
            } else if (!tvGone && state.isPip) {
                state.isPip=false; pip.classList.remove('active'); frame.innerHTML='';
            }
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
                const t = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:c.tz});
                return `<div class="clock-row"><span class="clock-city"><span class="clock-flag">${c.flag}</span>${c.label}</span><span class="clock-time">${t}</span></div>`;
            }).join('');
        }
        tick(); setInterval(tick, 15000);
    }

    async function initGold() {
        const body = document.getElementById('market-body');
        if (!body) return;
        body.innerHTML = `
        <div class="gold-row"><span class="gold-sym">XAUUSD</span><span class="gold-px" id="px-gold">—</span><span class="gold-chg" id="chg-gold">ذهب</span></div>
        <div class="gold-row" style="margin-top:3px;"><span class="gold-sym">XAGUSD</span><span class="gold-px" id="px-silver">—</span><span class="gold-chg" id="chg-silver">فضة</span></div>`;
        const fp = async(sym,px,chg) => {
            try {
                const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`);
                const d = await r.json();
                const rr = d?.chart?.result?.[0]; if(!rr) return;
                const cl = rr.indicators.quote[0].close;
                const last=cl[cl.length-1], prev=cl[cl.length-2]||last;
                const pct=((last-prev)/prev*100).toFixed(2);
                const pxEl=document.getElementById(px), chEl=document.getElementById(chg);
                if(pxEl){pxEl.textContent=last.toFixed(1);pxEl.style.color=pct>=0?'#2ecc71':'#e74c3c';}
                if(chEl){chEl.textContent=`${pct>=0?'+':''}${pct}%`;chEl.className='gold-chg '+(pct>=0?'up':'dn');}
            } catch(e) {}
        };
        fp('GC=F','px-gold','chg-gold'); fp('SI=F','px-silver','chg-silver');
        setInterval(()=>{fp('GC=F','px-gold','chg-gold');fp('SI=F','px-silver','chg-silver');},60000);
    }

    /* ─ Nav ─ */
    function bindNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', e => {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
