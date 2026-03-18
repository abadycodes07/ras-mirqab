/**
 * RAS MIRQAB MOBILE V56 - THE FLOW & FUNCTION OVERHAUL
 */

const MobileApp = {
    version: 'v56',
    activeVideo: null,

    init: function() {
        console.log('--- 🚀 RAS MIRQAB MOBILE V56: FLOW & FUNCTION START ---');
        
        try {
            this.initNews();
            this.initTV();
            this.initWidgets();
            this.bindEvents();
            this.unlockAudio();
            this.initLayers();
            
            if (window.RasMirqabGlobe) {
                RasMirqabGlobe.init();
            }
        } catch (e) {
            console.error('V56 Init Failed:', e);
        }
    },

    unlockAudio: function() {
        const unlock = () => {
            window.audioUnlocked = true;
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
    },

    // ═══ NEWS ENGINE (FIXED PATHS & RTL) ═══
    initNews: function() {
        if (!window.BreakingNewsWidget) return;

        window.BreakingNewsWidget.renderOverride = (container, items) => {
            if (!container) return;
            
            // USE ABSOLUTE PATHS FOR LOGOS TO PREVENT EXCLAMATION MARKS
            const ROOT = window.location.origin + (window.location.pathname.startsWith('/ras-mirqab') ? '/ras-mirqab' : '');
            
            container.innerHTML = items.slice(0, 30).map(item => {
                const date = item.pubDate ? new Date(item.pubDate) : new Date();
                
                // Arabic Relative Time with "منذ"
                let timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                if (window.BreakingNewsWidget.getArabicRelativeTime) {
                    timeStr = window.BreakingNewsWidget.getArabicRelativeTime(date);
                    if (!timeStr.includes('منذ')) timeStr = 'منذ ' + timeStr;
                }
                
                const handle = (item.sourceHandle || 'Default').toLowerCase();
                const source = item.source || 'rss';
                
                // Fix path logic
                const logo = `${ROOT}/public/logos/${handle}.jpg`;
                const fallbackLogo = `${ROOT}/public/logos/default.png`;
                
                let thumb = null;
                if (item.mediaUrl) thumb = item.mediaUrl;
                else if (item.image) thumb = item.image;
                else if (item.media && item.media[0]) thumb = item.media[0].url || item.media[0];
                
                const platformColor = source === 'telegram' ? '#0088cc' : (source === 'twitter' ? '#fff' : '#ff701a');
                const platformIcon = source === 'telegram' ? 'T' : (source === 'twitter' ? '𝕏' : '🌐');

                return `
                    <div class="item-news" onclick="window.open('${item.link}', '_blank')">
                        <div class="n-meta">
                            <span class="n-time">${timeStr}</span>
                            <div class="n-logo-wrap">
                                <img src="${logo}" class="n-logo" onerror="this.src='${fallbackLogo}'">
                                <div class="n-badge" style="background:${platformColor}; color:${source==='twitter'?'#000':'#fff'}">${platformIcon}</div>
                            </div>
                        </div>
                        <div class="n-text">${item.title}</div>
                        ${thumb ? `<img src="${thumb}" class="n-thumb" onerror="this.style.display='none'">` : ''}
                    </div>
                `;
            }).join('');
        };

        window.BreakingNewsWidget.init();
        if (window.BreakingNewsWidget.fetchServerCache) {
            window.BreakingNewsWidget.fetchServerCache();
        }
    },

    initTV: function() {
        const carousel = document.getElementById('tv-carousel');
        if (!carousel) return;

        const channels = [
            { name: 'الجزيرة', id: 'bNyUyrR0PHo' },
            { name: 'العربية', id: 'n7eQejkXbnM' },
            { name: 'الحدث', id: 'xWXpl7azI8k' },
            { name: 'Sky News', id: 'U--OjmpjF5o' },
            { name: 'TRT Arabic', id: 'p0m0h94C0f8' }
        ];

        carousel.innerHTML = channels.map((ch, idx) => `
            <div class="tv-item ${idx === 0 ? 'active' : ''}" data-ytid="${ch.id}" id="tv-${ch.id}">
                <img src="https://img.youtube.com/vi/${ch.id}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover; opacity:0.6;">
                <div class="tv-live">LIVE</div>
                <div class="tv-name">${ch.name}</div>
            </div>
        `).join('');

        carousel.querySelectorAll('.tv-item').forEach(card => {
            card.onclick = () => this.playStreamInPiP(card);
        });

        setTimeout(() => {
            const first = carousel.querySelector('.tv-item');
            if (first) this.playStreamInPiP(first, true);
        }, 1500);
    },

    playStreamInPiP: function(card, silent = false) {
        const id = card.getAttribute('data-ytid');
        const mute = silent ? 1 : 0;
        
        document.querySelectorAll('.tv-item').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        let pip = document.getElementById('mobile-pip-container');
        if (!pip) {
            pip = document.createElement('div');
            pip.id = 'mobile-pip-container';
            pip.className = 'pip-overlay';
            pip.innerHTML = `
                <div style="position:absolute; top:4px; right:4px; z-index:10; cursor:pointer;" id="close-pip">×</div>
                <div id="pip-player-wrap" style="width:100%; height:100%;"></div>
            `;
            document.body.appendChild(pip);
            document.getElementById('close-pip').onclick = () => pip.style.display = 'none';
            this.makeDraggable(pip);
        }
        
        pip.style.display = 'block';
        document.getElementById('pip-player-wrap').innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1&mute=${mute}&controls=0" frameborder="0" allow="autoplay" style="width:100%; height:100%;"></iframe>`;
    },

    makeDraggable: function(el) {
        let offsetX, offsetY;
        el.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            offsetX = touch.clientX - el.offsetLeft;
            offsetY = touch.clientY - el.offsetTop;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            el.style.left = (touch.clientX - offsetX) + 'px';
            el.style.top = (touch.clientY - offsetY) + 'px';
        }, { passive: true });
    },

    initWidgets: function() {
        const clockEl = document.getElementById('widget-clocks');
        if (clockEl) {
            const updateClocks = () => {
                const nyc = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' });
                const kwt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kuwait' });
                clockEl.innerHTML = `
                    <div class="clock-row">
                        <div class="clock-city">NYC</div>
                        <div class="clock-time">${nyc}</div>
                    </div>
                    <div class="clock-row">
                        <div class="clock-city">KUWAIT</div>
                        <div class="clock-time">${kwt}</div>
                    </div>
                `;
            };
            updateClocks();
            setInterval(updateClocks, 60000);
        }

        const marketEl = document.getElementById('widget-market');
        if (marketEl) {
            marketEl.innerHTML = `<iframe src="https://s.tradingview.com/embed-widget/single-quote/?symbol=OANDA%3AXAUUSD&colorTheme=dark&isTransparent=true&width=100%&height=120" frameborder="0" style="width:100%; height:120px;"></iframe>`;
        }
    },

    initLayers: function() {
        const list = document.getElementById('layers-list');
        if (!list || !window.RasMirqabData) return;

        list.innerHTML = Object.keys(RasMirqabData.categories).map(key => {
            const cat = RasMirqabData.categories[key];
            const isChecked = window.RasMirqabGlobe?.activeLayers?.[key] !== false ? 'checked' : '';
            return `
                <div style="display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.08);">
                    <input type="checkbox" data-layer="${key}" ${isChecked}>
                    <span style="font-size:14px; font-weight:800;">${cat.emoji} ${cat.labelAr}</span>
                </div>
            `;
        }).join('');

        list.querySelectorAll('input').forEach(box => {
            box.onchange = (e) => {
                if (window.RasMirqabGlobe) {
                    RasMirqabGlobe.activeLayers[e.target.dataset.layer] = e.target.checked;
                    RasMirqabGlobe.updateGlobeMarkers();
                }
            };
        });
    },

    bindEvents: function() {
        // Map Status
        const hideBtn = document.getElementById('btn-hide-map');
        const bookmark = document.getElementById('show-map-bookmark');
        const setMapStatus = (isVisible) => {
            document.body.classList.toggle('map-hidden', !isVisible);
        };
        if (hideBtn) hideBtn.onclick = () => setMapStatus(false);
        if (bookmark) bookmark.onclick = () => setMapStatus(true);

        // 2D/3D
        const btn2d = document.getElementById('btn-2d');
        const btn3d = document.getElementById('btn-3d');
        if (btn2d) btn2d.onclick = () => {
            btn2d.classList.add('active'); btn3d.classList.remove('active');
            if (window.RasMirqabGlobe) RasMirqabGlobe.toggleView('2d');
        };
        if (btn3d) btn3d.onclick = () => {
            btn3d.classList.add('active'); btn2d.classList.remove('active');
            if (window.RasMirqabGlobe) RasMirqabGlobe.toggleView('3d');
        };

        // Layers Modal
        const lBtn = document.getElementById('btn-layers');
        const lModal = document.getElementById('layers-modal');
        if (lBtn) lBtn.onclick = () => lModal.classList.remove('hidden');
        document.getElementById('close-layers').onclick = () => lModal.classList.add('hidden');

        // Bell Menu
        const bellTrigger = document.getElementById('bell-trigger');
        const bellMenu = document.getElementById('bell-menu');
        if (bellTrigger) bellTrigger.onclick = () => {
            bellMenu.style.display = bellMenu.style.display === 'block' ? 'none' : 'block';
        };

        // Footer
        document.querySelectorAll('.f-item').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.f-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            };
        });

        // Sync
        const syncLaunch = document.getElementById('hard-sync-launch');
        if (syncLaunch) syncLaunch.onclick = () => window.location.reload(true);
    }
};

window.MobileApp = MobileApp;
document.addEventListener('DOMContentLoaded', () => MobileApp.init());
